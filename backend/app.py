import json
import re
import traceback
import tempfile
import os
import numpy as np
import requests
import cv2
import redis

# ── IMPORTANT: Must import and load model BEFORE deepface/keras! ──
try:
    from backend.model_loader import load_emotion_model, load_emotion_labels
except ImportError:
    from model_loader import load_emotion_model, load_emotion_labels

from pydantic import BaseModel
from transformers import pipeline

class TextRequest(BaseModel):
    text: str
    language: str = "Any"

# Loading custom emotion model (Image/Webcam mode fallback)
emotion_model = None
idx_to_label = {}

text_emotion_pipeline = None

def get_text_pipeline():
    global text_emotion_pipeline
    if text_emotion_pipeline is None:
        print("Initializing text emotion Transformer model...")
        text_emotion_pipeline = pipeline(
            "text-classification", 
            model="bhadresh-savani/distilbert-base-uncased-emotion",
            framework="pt"
        )
    return text_emotion_pipeline

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from deepface import DeepFace
    print("DeepFace loaded successfully.")
except Exception as e:
    print(f"WARNING: DeepFace failed to load: {e}")
    DeepFace = None

# Removed duplicate TextRequest

app = FastAPI(
    title="Emotion Detection API",
    description="Hybrid pipeline: DeepFace for face detection, custom CNN for emotion classification.",
    version="3.0.0",
)

# ── Redis Caching Setup ──
# Redis will store YouTube research results for 24 hours.
# Connection is wrapped in a try-except to keep the app functional even without a Redis server.
try:
    redis_url = os.getenv("REDIS_URL", f"redis://{os.getenv('REDIS_HOST', 'localhost')}:6379/0")
    redis_client = redis.from_url(redis_url, decode_responses=True)
    redis_client.ping()
    print(f"Redis caching connected successfully.")
except Exception as e:
    print(f"WARNING: Redis not connected. Caching disabled. Error: {e}")
    redis_client = None


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load custom model & labels at startup with error protection
try:
    print("Initializing Visual Emotion Model...")
    emotion_model = load_emotion_model()
    idx_to_label = load_emotion_labels()
except Exception as e:
    print(f"WARNING: Visual model failed to load: {e}")
    emotion_model = None
    idx_to_label = {}


# Emotion → YouTube search query
EMOTION_QUERIES = {
    "happy":    "happy upbeat pop",
    "sad":      "sad emotional",
    "angry":    "heavy aggressive",
    "neutral":  "chill relaxing acoustic",
    "surprise": "feel good party",
    "fear":     "calming peaceful",
    "disgust":  "moody atmospheric",
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
    if emotion_model is None:
        raise ValueError("The custom emotion CNN model (.h5) failed to load during server startup due to environment issues. Prediction aborted.")
        
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


def get_music_by_emotion(emotion: str, limit: int = 5, language: str = "Any"):
    """Search YouTube for songs matching the detected emotion, customized by language."""
    
    # If a specific local region/language is selected, we MUST use very simple keywords.
    # Otherwise, YouTube's NLP engine will prioritize English genres (e.g. "pop", "acoustic") and ignore the language.
    if language and language.strip() and language.lower() != "any":
        simplified_keywords = {
            "happy":    "happy",
            "sad":      "sad",
            "angry":    "angry",
            "neutral":  "relaxing",
            "surprise": "party",
            "fear":     "calming",
            "disgust":  "lofi",
        }
        keyword = simplified_keywords.get(emotion, emotion)
        query = f"{language} {keyword} songs"
    else:
        # Default global English-focused queries
        query = EMOTION_QUERIES.get(emotion, "top music")
        
    print(f"[DEBUG] Processing music request (Emotion: {emotion}, Region: {language})")

    # ── Step 1: Check Redis Cache ──────
    cache_key = f"yt_cache:{emotion}:{language.lower().replace(' ', '_')}"
    if redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                print(f"[CACHE HIT] Returning results from Redis for key: {cache_key}")
                return json.loads(cached_data)
        except Exception as e:
            print(f"WARNING: Redis read error: {e}")

    # ── Step 2: Scrape YouTube (Cache Miss) ──────
    print(f"[CACHE MISS] Fetching fresh data from YouTube for query: '{query}'")
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

        # ── Step 3: Store in Redis Cache (expires in 24 hours) ──────
        if redis_client and songs:
            try:
                redis_client.setex(cache_key, 86400, json.dumps(songs))
                print(f"[CACHE STORE] Saved {len(songs)} tracks to Redis for key: {cache_key}")
            except Exception as e:
                print(f"WARNING: Redis write error: {e}")

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
async def predict(file: UploadFile = File(...), language: str = Form("Any")):
    """Upload a face image → DeepFace fallback → custom CNN emotion → YouTube songs."""

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
        songs = get_music_by_emotion(emotion, language=language)

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
@app.post("/predict-text")
async def predict_text(request: TextRequest):
    """Analyze emotion from text using a Transformer model → YouTube songs."""
    try:
        text = request.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Transformer Inference (Lazy Load)
        pipe = get_text_pipeline()
        results = pipe(text)
        # Result example: [{'label': 'joy', 'score': 0.99}]
        raw_label = results[0]["label"]
        confidence = round(float(results[0]["score"]), 4)

        # Map Transformer labels to our system emotions
        label_map = {
            "joy": "happy",
            "sadness": "sad",
            "anger": "angry",
            "fear": "fear",
            "surprise": "surprise",
            "love": "happy"
        }
        
        emotion = label_map.get(raw_label, "neutral")

        # Step 3: Get music recommendations
        songs = get_music_by_emotion(emotion, language=request.language)

        return {
            "emotion":       emotion,
            "raw_label":     raw_label,
            "confidence":    confidence,
            "text_analyzed": text,
            "songs":         songs,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
