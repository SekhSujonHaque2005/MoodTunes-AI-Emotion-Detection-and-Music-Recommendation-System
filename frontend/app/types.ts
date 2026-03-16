export interface Song {
  title: string;
  video_id: string;
  thumbnail: string;
  channel: string;
  duration: string;
}

export interface PredictResponse {
  emotion: string;
  confidence: number;
  face_detected: boolean;
  all_emotions?: Record<string, number>;
  songs: Song[];
}

export type InputMode = "upload" | "webcam";
export type PlayerMode = "video" | "audio";
