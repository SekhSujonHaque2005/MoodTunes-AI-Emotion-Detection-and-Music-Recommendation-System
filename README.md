# 🎵 MoodTunes: AI Emotion Detection & Music Recommendation System

![Python](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-black?logo=next.js)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-orange?logo=tensorflow)

## 📌 Overview

**MoodTunes** detects user emotions from their face and instantly recommends YouTube music playlists that match their current mood. It features a modern Next.js frontend and a fast, asynchronous FastAPI Python backend powered by a **Hybrid AI Pipeline** combining DeepFace for structural detection and a custom Convolutional Neural Network (CNN) for emotion classification.

---

## ✨ Advanced Features

-   🎭 **Hybrid Visual AI Pipeline**: Uses DeepFace for face extraction and a Custom CNN for emotion classification.
-   🧠 **Transformer Sentiment Engine**: State-of-the-art NLP models analyze written thoughts to find hidden emotional depth.
-   🎵 **Intelligent Music Mapping**: Real-time YouTube integration with **Global Regional Support** (Hindi, Bengali, etc.).
-   ⚡ **Sub-second Delivery (Redis)**: Distributed caching ensures ultra-fast response times for frequent mood searches.
-   📱 **Full PWA Experience**: Installable on mobile and desktop with offline support and app-like performance.
-   📚 **Premium Documentation**: Full technical guides available at `/docs`.

---

## 🏗️ The Technical Architecture

MoodTunes operates on a modern, distributed stack designed for speed and reliability:

1.  **Ingestion**: Captured biometric pixels (Webcam/Upload) or Natural Language (Text).
2.  **Engine Routing**: Proprietary CNN logic for visual data or HuggingFace Transformers for text sentiment.
3.  **Neural Inference**: Classifying input into one of 7 distinct emotion layers with high confidence scoring.
4.  **Optimized Fulfillment**: YouTube search fulfills recommendations, with **Redis** ensuring results are cached and reused efficiently.

---

## 🛠️ Stack Overview

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, TypeScript, Tailwind v4 |
| **Backend** | FastAPI (Asynchronous), Python 3.10+ |
| **AI Neural** | TensorFlow, Keras, HuggingFace Transformers |
| **Performance** | Redis for Distributed Result Caching |
| **DevOps** | Docker, Progressive Web App (PWA) |

---

The project consists of two separate servers that need to run simultaneously: the Python Backend and the Next.js Frontend.

### 1. Start the FastAPI Backend
The backend handles the AI models and API requests.

```bash
# 1. Navigate to the project root
cd Emotion-Detection-and-Music-Recommendation-System

# 2. Activate your virtual environment
venv\Scripts\activate      # Windows
# source venv/bin/activate # macOS/Linux

# 3. Install dependencies (if not already done)
pip install -r requirements.txt

# 4. Start the Uvicorn server (runs on port 8000)
cd backend
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```
*The backend will be available at `http://localhost:8000`. You can view the automated API docs at `http://localhost:8000/docs`.*

### 2. Start the Next.js Frontend
The frontend provides the interactive user interface. Open a **new terminal window**.

```bash
# 1. Navigate to the project root
cd Emotion-Detection-and-Music-Recommendation-System

# 2. Navigate to the frontend folder
cd frontend

# 3. Install NPM packages (if not already done)
npm install

# 4. Start the development server (runs on port 3000)
npm run dev
```
*The frontend will be available at `http://localhost:3000`.*

---

## ⚠️ Important Note on Keras Version Compatibility

The provided `models/emotion_model.h5` was originally trained using an older TensorFlow/Keras 2.x environment (which relied on the `batch_shape` configuration in the `InputLayer`).

If you are running this project in a modern Keras 3.x environment (TF >= 2.16), the original model file cannot be deserialized correctly. To resolve this, you must either:
1. Downgrade the environment: `pip install "tensorflow<2.16"`
2. **Or**, re-train and re-save your custom `.h5` model inside a native Keras 3 environment.

*(For testing purposes, a placeholder dummy model is generated so the API endpoints function without crashing).*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).