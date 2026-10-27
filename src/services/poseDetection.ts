import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame, PoseSequence } from '../types/pose';

/*
 * Browser-side pose detection with MediaPipe Pose Landmarker.
 *
 * Everything runs on the user's device: the video is decoded into a canvas
 * frame by frame and handed to the model locally. No frame, no file, and no
 * landmark ever leaves the browser — which is what lets the Privacy page
 * keep promising that uploads are never transmitted.
 *
 * The model weights and the WebAssembly runtime are fetched from Google's
 * and jsDelivr's CDNs on first use (a few MB, cached by the browser). They
 * could be self-hosted under public/ later if that dependency is unwanted.
 */

const MEDIAPIPE_VERSION = '1.1.1';
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

// Analysis settings. 10 fps is plenty for joint angles and keeps a 10-second
// clip at ~100 model passes; longer clips are truncated, not rejected.
export const SAMPLE_FPS = 10;
export const MAX_ANALYZED_MS = 12_000;
const MAX_FRAME_WIDTH = 640; // detection runs on a downscaled frame for speed
const OUT_OF_FRAME_VISIBILITY = 0.2;

export class PoseDetectionError extends Error {
  code: 'model-load-failed' | 'video-unreadable' | 'aborted';
  constructor(code: PoseDetectionError['code']) {
    super(`pose-detection:${code}`);
    this.name = 'PoseDetectionError';
    this.code = code;
  }
}

// One shared landmarker per page. Loading it is the slow part (several MB),
// so it is created once and reused for every video in the session.
let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    // GPU is much faster where WebGL is available; fall back to CPU so the
    // feature still works on machines without it.
    landmarkerPromise = createLandmarker('GPU')
      .catch(() => createLandmarker('CPU'))
      .catch((error) => {
        landmarkerPromise = null; // allow a retry on the next attempt
        throw error;
      });
  }
  return landmarkerPromise;
}

// detectForVideo requires strictly increasing timestamps for the lifetime
// of the landmarker. Two consecutive videos both start at 0, so an offset
// keeps the sequence monotonic across files.
let lastTimestampMs = 0;

function nextTimestamp(localMs: number, baseMs: number): number {
  const candidate = baseMs + localMs;
  lastTimestampMs = Math.max(lastTimestampMs + 1, candidate);
  return lastTimestampMs;
}

function seekTo(video: HTMLVideoElement, timeSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new PoseDetectionError('video-unreadable'));
    };
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      clearTimeout(timer);
    };
    // Some containers never fire `seeked` for the final frame; don't hang.
    const timer = setTimeout(onSeeked, 1500);
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.currentTime = timeSeconds;
  });
}

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    const onLoaded = () => {
      video.removeEventListener('error', onError);
      resolve({ video, url });
    };
    const onError = () => {
      URL.revokeObjectURL(url);
      reject(new PoseDetectionError('video-unreadable'));
    };
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

export interface ExtractOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/*
 * Runs pose detection over a video file and returns every frame in which a
 * person was found, with landmarks in source-video pixel coordinates.
 */
export async function extractPoseSequence(
  file: File,
  options: ExtractOptions = {},
): Promise<PoseSequence> {
  const { onProgress, signal } = options;

  let landmarker: PoseLandmarker;
  try {
    landmarker = await loadPoseLandmarker();
  } catch {
    throw new PoseDetectionError('model-load-failed');
  }

  const { video, url } = await loadVideo(file);
  try {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height || !Number.isFinite(video.duration)) {
      throw new PoseDetectionError('video-unreadable');
    }

    const durationMs = Math.min(video.duration * 1000, MAX_ANALYZED_MS);
    const stepMs = 1000 / SAMPLE_FPS;

    const scale = Math.min(1, MAX_FRAME_WIDTH / width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new PoseDetectionError('video-unreadable');

    const baseTimestamp = lastTimestampMs + 1000;
    const frames: PoseFrame[] = [];
    let sampled = 0;

    for (let t = 0; t < durationMs; t += stepMs) {
      if (signal?.aborted) throw new PoseDetectionError('aborted');

      await seekTo(video, t / 1000);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      sampled += 1;

      const result = landmarker.detectForVideo(canvas, nextTimestamp(t, baseTimestamp));
      const landmarks = result.landmarks[0];
      if (landmarks && landmarks.length === 33) {
        frames.push({
          timestampMs: t,
          // Back to full-resolution pixel space so angles are undistorted.
          // The model still guesses joints that fall outside the frame (feet
          // cut off at the bottom are common); those guesses are not
          // measurements, so their visibility is capped low enough to pull
          // the metric's confidence down.
          landmarks: landmarks.map((l) => {
            const inFrame = l.x >= 0 && l.x <= 1 && l.y >= 0 && l.y <= 1;
            const visibility = l.visibility ?? 0;
            return {
              x: l.x * width,
              y: l.y * height,
              z: l.z,
              visibility: inFrame ? visibility : Math.min(visibility, OUT_OF_FRAME_VISIBILITY),
            };
          }),
        });
      }

      onProgress?.(Math.min(1, (t + stepMs) / durationMs));
    }

    return { frames, sampledFrames: sampled, width, height, durationMs };
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
