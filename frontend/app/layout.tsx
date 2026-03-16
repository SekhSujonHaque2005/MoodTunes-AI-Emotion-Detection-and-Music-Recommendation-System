import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoodTunes — AI Emotion Detection & Music Recommendation",
  description: "Upload a photo or use your webcam — our AI detects your emotion and plays matching music instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-layout">{children}</body>
    </html>
  );
}
