# 🏗️ System Architecture

This document describes the high-level architecture of the Emotion Detection and Music Recommendation System.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│                    (Next.js Frontend)                           │
│           Webcam Feed │ Music Player │ Emotion Display          │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP Requests
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Flask Backend (API)                        │
│                       backend/app.py                            │
│                                                                 │
│   ┌─────────────────────┐   ┌───────────────────────────────┐  │
│   │  Emotion Detection  │   │  Music Recommendation Engine  │  │
│   │  (OpenCV + CNN)     │   │  (Spotipy / Spotify API)      │  │
│   └─────────┬───────────┘   └───────────────────────────────┘  │
└─────────────┼───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│   Trained CNN Model         │
│   models/emotion_model.h5   │
│   (TensorFlow / Keras)      │
│   Trained on FER2013        │
└─────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend (Next.js)
- Captures video from the user's webcam
- Sends frames to the backend for emotion analysis
- Displays detected emotion and recommended music/playlist
- Music player for streaming recommendations

### 2. Backend (Flask)
- Receives image frames from the frontend via REST API
- Preprocesses frames using OpenCV (grayscale, resize to 48×48)
- Runs inference using the trained emotion detection model
- Calls the Spotify API via Spotipy to fetch mood-matched playlists
- Returns emotion label and music recommendations to the frontend

### 3. Emotion Detection Model (CNN)
- Architecture: Convolutional Neural Network (CNN)
- Framework: TensorFlow / Keras
- Dataset: FER2013 (7 emotion classes)
- Input: 48×48 grayscale facial image
- Output: Probability distribution over 7 emotions

### 4. Music Recommendation Engine (Spotipy)
- Maps detected emotion to a music mood/genre
- Fetches relevant playlists or tracks from Spotify
- Returns track list to the frontend

---

## Data Flow

```
Webcam → Frontend
       → POST /predict (image frame)
       → Backend: OpenCV preprocess → CNN model → emotion label
       → Backend: emotion label → Spotipy → playlist/tracks
       → Response: { emotion, tracks }
       → Frontend: display emotion + play music
```

---

## Emotion → Music Mood Mapping

| Detected Emotion | Music Mood / Genre        |
|------------------|---------------------------|
| Happy            | Pop, Upbeat               |
| Sad              | Acoustic, Blues           |
| Angry            | Rock, Metal               |
| Neutral          | Chill, Ambient            |
| Surprise         | Electronic, Dance         |
| Fear             | Instrumental, Calm        |
| Disgust          | Jazz, Lo-fi               |

---

## Technology Stack Summary

| Component          | Technology               |
|--------------------|--------------------------|
| Frontend           | Next.js (React)          |
| Backend API        | Flask (Python)           |
| Computer Vision    | OpenCV                   |
| Deep Learning      | TensorFlow / Keras       |
| Music API          | Spotipy (Spotify)        |
| Model Training     | Jupyter Notebook         |
| Dataset            | FER2013                  |

---

*Architecture diagram will be updated as the system evolves.*
