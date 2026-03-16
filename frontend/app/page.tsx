"use client";

import { useRef, useState, useCallback } from "react";
import type { Song, PredictResponse, InputMode, PlayerMode } from "./types";

const API_BASE = "http://127.0.0.1:8000";

const EMOTION_META: Record<string, { emoji: string; color: string }> = {
  happy:    { emoji: "😊", color: "em-happy" },
  sad:      { emoji: "😢", color: "em-sad" },
  angry:    { emoji: "😠", color: "em-angry" },
  neutral:  { emoji: "😐", color: "em-neutral" },
  surprise: { emoji: "😲", color: "em-surprise" },
  fear:     { emoji: "😨", color: "em-fear" },
  disgust:  { emoji: "🤢", color: "em-disgust" },
};

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [playerMode, setPlayerMode] = useState<PlayerMode>("video");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Upload ──────────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("⚠️ Please upload an image file");
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setActiveSong(null);
    setError(null);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ── Webcam ───────────────────────────────────────────────────────────────
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setWebcamActive(true);
    } catch {
      showToast("❌ Camera access denied");
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamActive(false);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });
      setImageFile(file);
      setPreviewUrl(canvas.toDataURL("image/jpeg"));
      setResult(null);
      setActiveSong(null);
      setError(null);
      showToast("📸 Frame captured!");
    }, "image/jpeg");
  };

  // ── Predict ──────────────────────────────────────────────────────────────
  const predict = useCallback(async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveSong(null);
    try {
      const form = new FormData();
      form.append("file", imageFile);
      const res = await fetch(`${API_BASE}/predict`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || "Prediction failed");
      }
      const data: PredictResponse = await res.json();
      setResult(data);
      if (!data.face_detected) showToast("⚠️ No face detected — ensure your face is clearly visible");
      if (data.songs.length > 0) setActiveSong(data.songs[0]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      showToast("❌ " + msg);
    } finally {
      setLoading(false);
    }
  }, [imageFile]);

  const meta = result ? (EMOTION_META[result.emotion] ?? { emoji: "🤔", color: "em-neutral" }) : null;

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="logo-icon">🎵</div>
          MoodTunes
          <span className="navbar-badge">AI Powered</span>
        </div>
        <div className="stats-row" style={{ margin: 0 }}>
          <span className="stat-chip">
            <span className="dot" style={{ background: "var(--green)" }} />
            API Online
          </span>
          <span className="stat-chip">🧠 TensorFlow</span>
          <span className="stat-chip">▶ YouTube</span>
        </div>
      </nav>

      <main className="main-container">
        {/* ── Hero ── */}
        <section className="hero">
          <h1>Detect Emotion.<br />Discover Music.</h1>
          <p>
            Upload a photo or capture from your webcam — our AI reads your emotion
            and instantly queues the perfect playlist.
          </p>
        </section>

        {/* ── Input + Result Grid ── */}
        <div className="grid-two">
          {/* LEFT: Image Input */}
          <div className="card">
            {/* Input mode tabs */}
            <div className="tabs">
              <button
                className={`tab ${inputMode === "upload" ? "active" : ""}`}
                onClick={() => { setInputMode("upload"); if (webcamActive) stopWebcam(); }}
              >
                📁 Upload Image
              </button>
              <button
                className={`tab ${inputMode === "webcam" ? "active" : ""}`}
                onClick={() => setInputMode("webcam")}
              >
                📷 Webcam
              </button>
            </div>

            {inputMode === "upload" ? (
              <>
                {!previewUrl && (
                  <div
                    className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                  >
                    <div className="upload-icon">🖼️</div>
                    <p><span>Click to upload</span> or drag & drop</p>
                    <p style={{ marginTop: 6, fontSize: "0.8rem", opacity: 0.6 }}>
                      JPG, PNG, WEBP supported
                    </p>
                    <input type="file" accept="image/*" onChange={onFileInput} />
                  </div>
                )}
                {previewUrl && (
                  <div className="preview-container" style={{ marginBottom: "1rem" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="webcam-container">
                  <video ref={videoRef} autoPlay playsInline muted style={{ display: webcamActive ? "block" : "none" }} />
                  {!webcamActive && (
                    <div className="webcam-overlay">
                      <span>📷</span>
                      <p>Camera not started</p>
                      <p style={{ fontSize: "0.75rem", opacity: 0.6 }}>Position your face clearly in frame</p>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {previewUrl && inputMode === "webcam" && (
                  <div className="preview-container" style={{ marginTop: "0.75rem", height: 100 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Captured" style={{ objectFit: "cover" }} />
                    <div style={{ position: "absolute", bottom: 6, right: 6, fontSize: "0.7rem", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 4, color: "#fff" }}>
                      Captured
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Action buttons */}
            <div className="btn-group" style={{ marginTop: "1rem" }}>
              {inputMode === "webcam" && !webcamActive && (
                <button className="btn btn-secondary" onClick={startWebcam}>📷 Start Camera</button>
              )}
              {inputMode === "webcam" && webcamActive && (
                <>
                  <button className="btn btn-primary" onClick={captureFrame}>📸 Capture</button>
                  <button className="btn btn-danger" onClick={stopWebcam}>⏹ Stop</button>
                </>
              )}
              {inputMode === "upload" && previewUrl && (
                <button className="btn btn-secondary btn-icon"
                  onClick={() => { setPreviewUrl(null); setImageFile(null); setResult(null); }}
                  title="Remove image"
                >✕</button>
              )}
              <button
                className="btn btn-primary"
                onClick={predict}
                disabled={!imageFile || loading}
                style={{ flex: 1 }}
              >
                {loading ? (
                  <><span className="spinner" /> Analyzing…</>
                ) : (
                  "🔍 Detect Emotion"
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Emotion Result */}
          <div className="card">
            <div className="card-title">🎭 Emotion Result</div>
            {!result && !loading && (
              <div className="empty-state">
                <span>🎭</span>
                <p>Upload an image and click<br /><strong>Detect Emotion</strong> to get started</p>
              </div>
            )}
            {loading && (
              <div className="empty-state analyzing">
                <span>🧠</span>
                <p>Analyzing your expression…</p>
              </div>
            )}
            {result && meta && (
              <div className="emotion-result-card">
                <div className="emotion-emoji">{meta.emoji}</div>
                <div className={`emotion-badge ${meta.color}`}>
                  {result.emotion.toUpperCase()}
                </div>
                <div className="confidence-bar-wrap">
                  <div className="confidence-label">
                    <span>Confidence</span>
                    <span>{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {/* Per-emotion breakdown */}
                {result.all_emotions && (
                  <div style={{ width: "100%", maxWidth: 300 }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 8, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      All Emotions
                    </div>
                    {Object.entries(result.all_emotions)
                      .sort((a, b) => b[1] - a[1])
                      .map(([em, score]) => (
                        <div key={em} style={{ marginBottom: 5 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", color: em === result.emotion ? "var(--accent-light)" : "var(--text-secondary)", marginBottom: 2, fontWeight: em === result.emotion ? 600 : 400 }}>
                            <span>{em}</span>
                            <span>{(score * 100).toFixed(1)}%</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: "var(--bg-hover)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 2, width: `${score * 100}%`, background: em === result.emotion ? "linear-gradient(90deg, var(--accent), var(--accent-light))" : "var(--text-muted)", transition: "width 0.6s ease" }} />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {!result.face_detected && (
                  <div style={{
                    background: "rgba(234,179,8,0.1)",
                    border: "1px solid rgba(234,179,8,0.3)",
                    borderRadius: 8,
                    padding: "0.6rem 1rem",
                    fontSize: "0.78rem",
                    color: "#eab308",
                    textAlign: "center",
                    maxWidth: 280,
                  }}>
                    ⚠️ No face detected — result may be inaccurate.<br />
                    Make sure your face fills most of the frame.
                  </div>
                )}
                {error && <p style={{ color: "var(--red)", fontSize: "0.85rem" }}>{error}</p>}
              </div>
            )}
          </div>
        </div>

        {/* ── Music Section ── */}
        {result && result.songs.length > 0 && (
          <div className="grid-two" style={{ marginTop: "1.5rem" }}>
            {/* Song List */}
            <div className="card">
              <div className="card-title">🎵 Recommended for {meta?.emoji} {result.emotion}</div>
              <div className="song-list">
                {result.songs.map((song) => (
                  <div
                    key={song.video_id}
                    className={`song-item ${activeSong?.video_id === song.video_id ? "active" : ""}`}
                    onClick={() => { setActiveSong(song); }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={song.thumbnail} alt={song.title} className="song-thumb" />
                    <div className="song-info">
                      <div className="song-title">{song.title}</div>
                      <div className="song-channel">{song.channel}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {song.duration && <span className="song-duration">{song.duration}</span>}
                      <div className="play-indicator">▶</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Player */}
            <div className="card">
              <div className="card-title">▶ Player</div>
              {activeSong ? (
                <>
                  <div className="player-mode-toggle">
                    <button
                      className={`mode-btn ${playerMode === "video" ? "active" : ""}`}
                      onClick={() => setPlayerMode("video")}
                    >
                      🎬 Video
                    </button>
                    <button
                      className={`mode-btn ${playerMode === "audio" ? "active" : ""}`}
                      onClick={() => setPlayerMode("audio")}
                    >
                      🎵 Audio Only
                    </button>
                  </div>

                  {playerMode === "video" ? (
                    <div className="player-embed">
                      <iframe
                        key={activeSong.video_id}
                        src={`https://www.youtube.com/embed/${activeSong.video_id}?autoplay=1`}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        title={activeSong.title}
                      />
                    </div>
                  ) : (
                    <div className="audio-only-player">
                      <div className="now-playing-title">{activeSong.title}</div>
                      <div className="audio-visualizer">
                        {[20,35,50,40,60,45,30,18].map((h, i) => (
                          <div
                            key={i}
                            className="viz-bar"
                            style={{ height: h }}
                          />
                        ))}
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                        Audio playing in background
                      </p>
                      {/* Hidden audio-only iframe */}
                      <iframe
                        key={`audio-${activeSong.video_id}`}
                        src={`https://www.youtube.com/embed/${activeSong.video_id}?autoplay=1`}
                        allow="autoplay; encrypted-media"
                        title="audio"
                        style={{ width: 0, height: 0, border: "none" }}
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={() => setPlayerMode("video")}
                      >
                        🎬 Show Video
                      </button>
                    </div>
                  )}

                  <div style={{ marginTop: "0.75rem" }}>
                    <a
                      href={`https://www.youtube.com/watch?v=${activeSong.video_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: "0.8rem", width: "100%", justifyContent: "center", display: "flex" }}
                    >
                      ↗ Open on YouTube
                    </a>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <span>▶</span>
                  <p>Select a song to play</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        MoodTunes — AI Emotion Detection & Music Recommendation &nbsp;·&nbsp;
        Built with Next.js + FastAPI + TensorFlow
      </footer>

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
