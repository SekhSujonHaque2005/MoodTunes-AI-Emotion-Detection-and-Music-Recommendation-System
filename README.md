# 🎵 Emotion Detection and Music Recommendation System

![Python](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-orange?logo=tensorflow)
![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask)
![License](https://img.shields.io/badge/License-MIT-green)

## 📌 Overview

This project detects user emotions in real-time using deep learning (CNN trained on FER2013) and recommends music that matches the detected mood. It combines computer vision, machine learning, and the Spotify API to deliver a personalized listening experience.

---

## ✨ Features

- 🎭 Real-time facial emotion detection via webcam
- 🎶 Mood-based music recommendation engine
- 🌐 Web interface built with Next.js
- 🔗 Spotify API integration for playlist suggestions
- 📊 Emotion analytics dashboard *(coming soon)*

---

## 🛠️ Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Deep Learning| TensorFlow / Keras                  |
| Computer Vision | OpenCV                           |
| Backend      | Flask (Python)                      |
| Frontend     | Next.js                             |
| Music API    | Spotipy (Spotify Web API)           |
| Dataset      | FER2013                             |

---

## 📁 Project Structure

```
Emotion-Detection-and-Music-Recommendation-System
│
├── backend
│   └── app.py              # Flask API server
│
├── data
│   ├── raw                 # Raw FER2013 data
│   ├── processed           # Preprocessed data
│   └── README.md
│
├── frontend                # Next.js web interface
│
├── models
│   └── emotion_model.h5    # Trained CNN model
│
├── training
│   └── train_model.ipynb   # Model training notebook
│
├── docs
│   └── architecture.md     # System architecture diagram
│
├── .gitignore
├── LICENSE
├── README.md
└── requirements.txt
```

---

## ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Emotion-Detection-and-Music-Recommendation-System.git
cd Emotion-Detection-and-Music-Recommendation-System

# (Optional) Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

---

## 🚀 Running the Backend

---

## 🧠 Model Training

Open the training notebook in Jupyter:

```bash
jupyter notebook training/train_model.ipynb
```

The notebook covers:
1. Loading and preprocessing the FER2013 dataset
2. Building the CNN architecture
3. Training and evaluating the model
4. Saving the trained model to `models/emotion_model.h5`

---

## 📂 Dataset

The **FER2013** (Facial Expression Recognition 2013) dataset from [Kaggle](https://www.kaggle.com/datasets/msambare/fer2013) is used for emotion detection.

- **Classes:** Angry, Disgust, Fear, Happy, Sad, Surprise, Neutral
- **Images:** 35,887 grayscale images (48×48 pixels)
- **Source:** [https://www.kaggle.com/datasets/msambare/fer2013](https://www.kaggle.com/datasets/msambare/fer2013)

Download and place the dataset inside `data/raw/`.

---

## 🔮 Future Improvements

- 📊 Emotion analytics dashboard
- 🌍 Multi-language support
- 📱 Mobile-friendly frontend
- 🎚️ Real-time mood-based playlist generation

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).