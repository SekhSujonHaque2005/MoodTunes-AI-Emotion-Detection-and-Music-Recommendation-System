"use client";

import { useRef, useState, useCallback } from "react";
import type { Song, PredictResponse, InputMode, PlayerMode } from "./types";

const API_BASE = "http://127.0.0.1:8000";

const EMOTION_META: Record<string, { emoji: string; color: string; label: string }> = {
  happy:    { emoji: "😊", color: "em-happy",    label: "Happy" },
  sad:      { emoji: "😢", color: "em-sad",      label: "Sad" },
  angry:    { emoji: "😠", color: "em-angry",    label: "Angry" },
  neutral:  { emoji: "😐", color: "em-neutral",  label: "Neutral" },
  surprise: { emoji: "😲", color: "em-surprise", label: "Surprised" },
  fear:     { emoji: "😨", color: "em-fear",     label: "Fearful" },
  disgust:  { emoji: "🤢", color: "em-disgust",  label: "Disgusted" },
};

const MINI_BAR_COLORS: Record<string, string> = {
  happy:    "#fbbf24", sad:  "#60a5fa", angry:   "#f87171",
  neutral:  "#94a3b8", fear: "#22d3ee", surprise: "#c084fc", disgust: "#34d399",
};

export default function Home() {
  const [inputMode, setInputMode]     = useState<InputMode>("upload");
  const [playerMode, setPlayerMode]   = useState<PlayerMode>("video");
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<PredictResponse | null>(null);
  const [activeSong, setActiveSong]   = useState<Song | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const [toast, setToast]             = useState<string | null>(null);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { showToast("⚠️ Please upload an image file"); return; }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null); setActiveSong(null); setError(null);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setWebcamActive(true);
    } catch { showToast("❌ Camera access denied"); }
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
      setResult(null); setActiveSong(null); setError(null);
      showToast("📸 Frame captured!");
    }, "image/jpeg");
  };

  const predict = useCallback(async () => {
    if (!imageFile) return;
    setLoading(true); setError(null); setResult(null); setActiveSong(null);
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
      setError(msg); showToast("❌ " + msg);
    } finally {
      setLoading(false);
    }
  }, [imageFile]);

  const meta = result ? (EMOTION_META[result.emotion] ?? { emoji: "🤔", color: "em-neutral", label: result.emotion }) : null;

  return (
    <>
      {/* ── Animated Background ── */}
      <div className="bg-scene">
        <div className="bg-grid" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <div className="page-shell">
        {/* ── Navbar ── */}
        <nav className="navbar">
          <div className="navbar-brand">
            <div className="logo-icon">🎵</div>
            <span className="logo-name">MoodTunes</span>
            <span className="navbar-badge">AI Powered</span>
          </div>
          <div className="navbar-right">
            <span className="status-chip">
              <span className="live-dot" />
              API Live
            </span>
            <span className="status-chip">🧠 DeepFace</span>
            <span className="status-chip">▶ YouTube</span>
          </div>
        </nav>

        <main className="main-container">
          {/* ── Hero ── */}
          <section className="hero">
            <span className="hero-decor">🎧</span>
            <span className="hero-decor">🎼</span>
            <span className="hero-decor">✨</span>
            <span className="hero-decor">🎵</span>

            <div className="hero-eyebrow">
              ✦ Emotion-Aware Music Intelligence
            </div>
            <h1>
              <span className="grad">Detect Emotion.</span>
              <br />
              <span className="grad">Discover Music.</span>
            </h1>
            <p className="hero-sub">
              Upload a photo or use your webcam — our AI reads your mood
              and instantly surfaces the perfect soundtrack for your moment.
            </p>
          </section>

          {/* ── Input + Result ── */}
          <div className="grid-two">
            {/* LEFT: Input Card */}
            <div className="card">
              <div className="card-title">🖼️ &nbsp;Face Input</div>

              <div className="tabs">
                <button
                  className={`tab ${inputMode === "upload" ? "active" : ""}`}
                  onClick={() => { setInputMode("upload"); if (webcamActive) stopWebcam(); }}
                >
                  📁 Upload
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
                      onClick={() => document.getElementById("fileInput")?.click()}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="upload-icon-wrap">🖼️</div>
                      <p><span>Click to upload</span> or drag &amp; drop</p>
                      <p style={{ marginTop: 8, fontSize: "0.8rem", opacity: 0.5 }}>
                        JPG · PNG · WEBP · GIF
                      </p>
                      <input 
                        id="fileInput" 
                        type="file" 
                        accept="image/*" 
                        onChange={onFileInput} 
                        style={{ display: "none" }} 
                      />
                    </div>
                  )}
                  {previewUrl && (
                    <div className="preview-container">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={webcamActive ? "webcam-active" : ""}>
                    <div className="webcam-container">
                      <video ref={videoRef} autoPlay playsInline muted style={{ display: webcamActive ? "block" : "none" }} />
                      {!webcamActive && (
                        <div className="webcam-overlay">
                          <span>📷</span>
                          <p style={{ fontWeight: 600 }}>Camera not started</p>
                          <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>Position your face clearly in frame</p>
                        </div>
                      )}
                      <div className="webcam-bracket tl" />
                      <div className="webcam-bracket tr" />
                      <div className="webcam-bracket bl" />
                      <div className="webcam-bracket br" />
                    </div>
                  </div>
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  {previewUrl && inputMode === "webcam" && (
                    <div className="preview-container" style={{ marginTop: "0.85rem", height: 90 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Captured" style={{ objectFit: "cover" }} />
                      <div style={{
                        position: "absolute", bottom: 8, right: 8,
                        background: "rgba(124,58,237,0.8)", backdropFilter: "blur(8px)",
                        padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem",
                        color: "#fff", fontWeight: 600, zIndex: 2,
                      }}>
                        📸 CAPTURED
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="btn-group">
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
                  <button
                    className="btn btn-secondary btn-icon"
                    onClick={() => { setPreviewUrl(null); setImageFile(null); setResult(null); setActiveSong(null); }}
                    title="Remove image"
                  >✕</button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={predict}
                  disabled={!imageFile || loading}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {loading
                    ? <><span className="spinner" /> Analyzing…</>
                    : "🔍 Detect Emotion"}
                </button>
              </div>
            </div>

            {/* RIGHT: Emotion Result */}
            <div className="card">
              <div className="card-title">🎭 &nbsp;Emotion Analysis</div>

              {!result && !loading && !error && (
                <div className="empty-state">
                  <div className="empty-icon">🎭</div>
                  <p>Upload a photo and click<br /><strong>Detect Emotion</strong> to get started</p>
                </div>
              )}

              {loading && (
                <div className="analyzing-wrap">
                  <div className="analyzing-brain">🧠</div>
                  <div>
                    <div className="analyzing-text">Reading your expression</div>
                    <div className="analyzing-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </div>
                  </div>
                </div>
              )}

              {error && !loading && (
                <div className="empty-state">
                  <div className="empty-icon">❌</div>
                  <p style={{ color: "var(--red)" }}>{error}</p>
                </div>
              )}

              {result && meta && !loading && (
                <div className="emotion-result-card">
                  <div className={`emotion-emoji-wrap ${meta.color}`}>
                    <div className={`emotion-glow-ring glow-ring`} />
                    <div className="emotion-emoji">{meta.emoji}</div>
                  </div>

                  <div className={`emotion-badge ${meta.color}`}>
                    {meta.emoji} {meta.label.toUpperCase()}
                  </div>

                  <div className="confidence-bar-wrap">
                    <div className="confidence-label">
                      <span>Confidence</span>
                      <span style={{ fontWeight: 700 }}>{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${result.confidence * 100}%` }} />
                    </div>
                  </div>

                  {result.all_emotions && (
                    <div className="emotions-breakdown">
                      <div className="breakdown-label">All Emotions</div>
                      {Object.entries(result.all_emotions)
                        .sort((a, b) => b[1] - a[1])
                        .map(([em, score]) => (
                          <div key={em} className="emotion-row">
                            <div className="emotion-row-header">
                              <span style={{
                                color: em === result.emotion ? MINI_BAR_COLORS[em] || "var(--accent-3)" : "var(--text-secondary)",
                                fontWeight: em === result.emotion ? 700 : 400,
                                fontSize: "0.77rem",
                              }}>
                                {EMOTION_META[em]?.emoji} {em}
                              </span>
                              <span style={{ color: "var(--text-muted)", fontSize: "0.73rem" }}>
                                {(score * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="emotion-mini-bar">
                              <div
                                className="emotion-mini-fill"
                                style={{
                                  width: `${score * 100}%`,
                                  background: em === result.emotion
                                    ? MINI_BAR_COLORS[em] || "var(--accent)"
                                    : "rgba(255,255,255,0.1)",
                                  boxShadow: em === result.emotion
                                    ? `0 0 8px ${MINI_BAR_COLORS[em]}40`
                                    : "none",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {!result.face_detected && (
                    <div className="warn-banner">
                      ⚠️ No face detected — result may be inaccurate. Make sure your face fills most of the frame.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Music Section ── */}
          {result && result.songs.length > 0 && (
            <div className="grid-two" style={{ marginTop: "1.5rem" }}>
              {/* Song List */}
              <div className="card">
                <div className="card-title">🎵 &nbsp;Recommended Tracks</div>
                <div className="section-header">
                  <span className="section-title">For your {meta?.emoji} mood</span>
                  <span className="section-badge">{result.songs.length} tracks</span>
                </div>
                <div className="song-list">
                  {result.songs.map((song) => (
                    <div
                      key={song.video_id}
                      className={`song-item ${activeSong?.video_id === song.video_id ? "active" : ""}`}
                      onClick={() => setActiveSong(song)}
                    >
                      <div className="song-thumb-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={song.thumbnail} alt={song.title} className="song-thumb" />
                        <div className="song-thumb-overlay">▶</div>
                      </div>
                      <div className="song-info">
                        <div className="song-title">{song.title}</div>
                        <div className="song-channel">{song.channel}</div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {song.duration && <span className="song-duration">{song.duration}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player */}
              <div className="card">
                <div className="card-title">▶ &nbsp;Now Playing</div>
                {activeSong ? (
                  <>
                    <div className="player-mode-toggle">
                      <button className={`mode-btn ${playerMode === "video" ? "active" : ""}`} onClick={() => setPlayerMode("video")}>
                        🎬 Video
                      </button>
                      <button className={`mode-btn ${playerMode === "audio" ? "active" : ""}`} onClick={() => setPlayerMode("audio")}>
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
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 4 }}>
                          {activeSong.channel}
                        </div>
                        <div className="audio-visualizer">
                          {[20, 36, 52, 44, 60, 48, 34, 22].map((h, i) => (
                            <div key={i} className="viz-bar" style={{ height: h }} />
                          ))}
                        </div>
                        <iframe
                          key={`audio-${activeSong.video_id}`}
                          src={`https://www.youtube.com/embed/${activeSong.video_id}?autoplay=1`}
                          allow="autoplay; encrypted-media"
                          title="audio"
                          style={{ width: 0, height: 0, border: "none" }}
                        />
                        <button className="btn btn-secondary" style={{ margin: "0 auto", display: "flex" }} onClick={() => setPlayerMode("video")}>
                          🎬 Show Video
                        </button>
                      </div>
                    )}

                    <div style={{ marginTop: "1rem" }}>
                      <a
                        href={`https://www.youtube.com/watch?v=${activeSong.video_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="yt-link"
                      >
                        ↗ Open on YouTube
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">▶</div>
                    <p>Select a song to start playing</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="footer">
          MoodTunes — AI Emotion Detection &amp; Music Recommendation &nbsp;·&nbsp;
          Built with <span>Next.js</span> + <span>FastAPI</span> + <span>DeepFace</span>
        </footer>
      </div>

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
