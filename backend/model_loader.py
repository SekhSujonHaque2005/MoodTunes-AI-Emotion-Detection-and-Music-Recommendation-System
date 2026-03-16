import os
import requests
from tensorflow.keras.models import load_model

MODEL_URL = "https://huggingface.co/sujon2005/Emotion_Detection_and_Music_Recommendation_System/resolve/main/emotion_model.h5"

MODEL_PATH = "models/emotion_model.h5"


def download_model():
    """Download the emotion model from HuggingFace if it doesn't exist locally."""
    if not os.path.exists(MODEL_PATH):
        print("Downloading emotion model from HuggingFace...")

        # Ensure the models directory exists
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

        r = requests.get(MODEL_URL, stream=True)
        r.raise_for_status()  # Raise an error for bad HTTP responses

        with open(MODEL_PATH, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        print("Model downloaded successfully.")
    else:
        print("Model already exists locally. Skipping download.")


def load_emotion_model():
    """Download (if needed) and load the emotion detection model."""
    download_model()
    model = load_model(MODEL_PATH)
    print("Emotion model loaded successfully.")
    return model
