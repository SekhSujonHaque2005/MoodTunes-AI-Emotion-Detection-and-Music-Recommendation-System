import json
import re
import traceback
import tempfile
import os
import numpy as np
import cv2
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace

app = FastAPI(
    title="Emotion Detection API",
    description="Detects emotions from images and recommends music accordingly.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Normalize DeepFace emotion keys to match our labels
DEEPFACE_EMOTION_MAP = {
    "angry":    "angry",
    "disgust":  "disgust",
    "fear":     "fear",
    "happy":    "happy",
    "sad":      "sad",
    "surprise": "surprise",
    "neutral":  "neutral",
}

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
    return {"message": "Emotion Detection API is running (DeepFace v2)"}


@app.get("/health")
def health():
    return {"status": "ok", "engine": "DeepFace"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Upload a face image → DeepFace emotion analysis → YouTube songs."""

    tmp_path = None
    try:
        contents = await file.read()

        # Decode image bytes to verify it's a valid image
        npimg = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Save to temp file (DeepFace works best with file paths)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name
            cv2.imwrite(tmp_path, img)

        # Run DeepFace emotion analysis — enforce_detection=False allows
        # it to work even if the face detector confidence is low
        result = DeepFace.analyze(
            img_path=tmp_path,
            actions=["emotion"],
            enforce_detection=False,
            silent=True,
        )

        # DeepFace returns a list; take the first (dominant) face
        face_result = result[0] if isinstance(result, list) else result
        dominant_emotion = str(face_result["dominant_emotion"]).lower()

        # Convert all emotion scores from numpy.float32 → Python float
        emotion_scores = {
            str(k): float(v)
            for k, v in face_result["emotion"].items()
        }
        confidence = round(emotion_scores[dominant_emotion] / 100.0, 4)

        # Normalize emotion key
        emotion = DEEPFACE_EMOTION_MAP.get(dominant_emotion, dominant_emotion)

        # Get music recommendations
        songs = get_music_by_emotion(emotion)

        return {
            "emotion":       emotion,
            "confidence":    confidence,
            "face_detected": True,
            "all_emotions":  {k: round(v / 100.0, 4) for k, v in emotion_scores.items()},
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
