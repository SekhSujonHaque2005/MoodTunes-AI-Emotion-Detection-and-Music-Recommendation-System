import json
import re
import traceback
import tempfile
import os

# ── IMPORTANT: Must import and load model BEFORE deepface/keras! ──
try:
    from backend.model_loader import load_emotion_model, load_emotion_labels
except ImportError:
    from model_loader import load_emotion_model, load_emotion_labels

print("Loading custom emotion model...")
# This applies the Keras 3 compat patch and loads the model
emotion_model = load_emotion_model()
idx_to_label = load_emotion_labels()
# ──────────────────────────────────────────────────────────────────

import numpy as np
import cv2
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace

app = FastAPI(
    title="Emotion Detection API",
    description="Hybrid pipeline: DeepFace for face detection, custom CNN for emotion classification.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load custom model & labels at startup ──────────────────────────────
print("Loading custom emotion model...")
emotion_model = load_emotion_model()
idx_to_label = load_emotion_labels()

# Emotion → YouTube search query
EMOTION_QUERIES = {
    "happy":    "happy upbeat feel good songs",
    "sad":      "sad emotional healing songs",
    "angry":    "motivational rock songs energy",
    "neutral":  "chill relaxing background music",
    "surprise": "feel good party music",
    "fear":     "calming peaceful piano music",
    "disgust":  "lofi hip hop chill beats",
}


def preprocess_face(face_pixels: np.ndarray) -> np.ndarray:
    """Convert a face crop to the format expected by our custom model:
    RGB, 224x224, normalised to [0,1], shape (1, 224, 224, 3).
    """
    # Ensure 3 channels (BGR → keep as-is for now, model was likely trained on RGB via keras)
    if len(face_pixels.shape) == 2:
        face_pixels = cv2.cvtColor(face_pixels, cv2.COLOR_GRAY2BGR)

    # Convert BGR to RGB (OpenCV loads as BGR, Keras models expect RGB)
    rgb = cv2.cvtColor(face_pixels, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (224, 224))
    normalised = resized.astype("float32") / 255.0
    return normalised.reshape(1, 224, 224, 3)


def classify_emotion(face_pixels: np.ndarray):
    """Run the custom CNN model on a preprocessed face crop.
    Returns (emotion_label, confidence, all_emotions_dict).
    """
    processed = preprocess_face(face_pixels)
    predictions = emotion_model.predict(processed, verbose=0)[0]

    # Build emotion scores dict
    all_emotions = {}
    for idx, score in enumerate(predictions):
        label = idx_to_label.get(idx, f"unknown_{idx}")
        all_emotions[label] = round(float(score), 4)

    predicted_idx = int(np.argmax(predictions))
    emotion = idx_to_label.get(predicted_idx, "neutral")
    confidence = round(float(predictions[predicted_idx]), 4)

    return emotion, confidence, all_emotions


def get_music_by_emotion(emotion: str, limit: int = 5):
    """Search YouTube for songs matching the detected emotion using plain requests."""
    query = EMOTION_QUERIES.get(emotion, "top music")
    url = "https://www.youtube.com/results"
    params = {"search_query": query}
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()

        match = re.search(r"var ytInitialData = ({.*?});</script>", response.text, re.DOTALL)
        if not match:
            return []

        data = json.loads(match.group(1))
        contents = (
            data.get("contents", {})
            .get("twoColumnSearchResultsRenderer", {})
            .get("primaryContents", {})
            .get("sectionListRenderer", {})
            .get("contents", [])
        )

        songs = []
        for section in contents:
            items = section.get("itemSectionRenderer", {}).get("contents", [])
            for item in items:
                video = item.get("videoRenderer")
                if not video:
                    continue
                video_id  = video.get("videoId", "")
                title     = video.get("title", {}).get("runs", [{}])[0].get("text", "")
                channel   = video.get("ownerText", {}).get("runs", [{}])[0].get("text", "")
                duration  = video.get("lengthText", {}).get("simpleText", "")
                thumbs    = video.get("thumbnail", {}).get("thumbnails", [])
                thumbnail = thumbs[-1]["url"] if thumbs else ""

                if video_id and title:
                    songs.append({
                        "title":     title,
                        "video_id":  video_id,
                        "thumbnail": thumbnail,
                        "channel":   channel,
                        "duration":  duration,
                    })
                    if len(songs) >= limit:
                        break
            if len(songs) >= limit:
                break

        return songs
    except Exception:
        traceback.print_exc()
        return []


@app.get("/")
def home():
    return {"message": "Emotion Detection API is running (Hybrid v3 — DeepFace + Custom CNN)"}


@app.get("/health")
def health():
    return {"status": "ok", "engine": "hybrid", "model": "custom_emotion_model.h5"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Upload a face image → DeepFace face detection → custom CNN emotion → YouTube songs."""

    tmp_path = None
    try:
        contents = await file.read()

        # Decode image bytes
        npimg = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Save to temp file for DeepFace
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name
            cv2.imwrite(tmp_path, img)

        # ── Step 1: Use DeepFace to detect & extract face regions ──────
        face_detected = True
        try:
            faces = DeepFace.extract_faces(
                img_path=tmp_path,
                detector_backend="opencv",
                enforce_detection=True,
                align=True,
            )

            if faces and len(faces) > 0:
                # Get the face crop (DeepFace returns RGB float [0,1])
                face_pixels = faces[0]["face"]
                # Convert from RGB float [0,1] to BGR uint8 [0,255]
                face_bgr = (face_pixels * 255).astype(np.uint8)
                face_bgr = cv2.cvtColor(face_bgr, cv2.COLOR_RGB2BGR)
            else:
                # Fallback: use the full image
                face_detected = False
                face_bgr = img

        except Exception:
            # Face detection failed — fallback to full image
            face_detected = False
            face_bgr = img

        # ── Step 2: Classify emotion with custom CNN model ─────────────
        emotion, confidence, all_emotions = classify_emotion(face_bgr)

        # ── Step 3: Get music recommendations ──────────────────────────
        songs = get_music_by_emotion(emotion)

        return {
            "emotion":       emotion,
            "confidence":    confidence,
            "face_detected": face_detected,
            "all_emotions":  all_emotions,
            "songs":         songs,
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
