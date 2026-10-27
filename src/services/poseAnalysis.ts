import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type {
  MetricStatus,
  MovementMetric,
  MovementReport,
  MovementType,
} from "../types/report";
import { createReportId } from "./reportStorage";
import {
  BANDS,
  LM,
  LOWER_BODY,
  POSE_METRIC_PREFIX,
  detectView,
  frontalKneeAngle,
  gradeFor,
  kneeFlexion,
  scoreFor,
  trunkLean,
} from "./poseMath";
import type { Band, CameraView, Grade, Point } from "./poseMath";

/*
 * Real movement analysis: MediaPipe Pose runs in the browser on frames of the
 * uploaded video. The video never leaves the device. Only the model and its
 * runtime are downloaded. Results are 2D estimates for education, not a
 * medical assessment.
 */

// Pinned so a CDN update can't change behavior under us.
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

// Frames analyzed per clip. 15 fps over at most 12 seconds is 180 frames,
// guessed as enough to catch the deepest point of a landing, never measured.
const SAMPLE_FPS = 15;
const MAX_SECONDS = 12;
// A landmark below this visibility is treated as not seen (MediaPipe's own
// examples use 0.5).
const MIN_VISIBILITY = 0.5;


export interface PoseAnalysisInput {
  file: File;
  movementType: MovementType;
  customMovementName?: string;
  notes?: string;
  userId: string | null;
  onProgress?: (fraction: number) => void;
}

export interface PoseAnalysisResult {
  report: MovementReport;
  // JPEG data URL of the key frame w the skeleton drawn on it. Kept in memory
  // only and never saved, so no image of the athlete is stored anywhere.
  keyFrame: string | null;
  view: CameraView;
  framesUsed: number;
  framesSampled: number;
}

export class PoseAnalysisError extends Error {
  name = 'PoseAnalysisError';
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null;
// The landmarker is shared across analyses and MediaPipe rejects any timestamp
// that isn't larger than the last one it saw, so this only ever goes up. A
// second analysis on the same page failed w "Packet timestamp mismatch"
// before this lived at module level (10/26).
let lastTimestamp = 0;

function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    })().catch((error: unknown) => {
      landmarkerPromise = null;
      throw error;
    });
  }
  return landmarkerPromise;
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    video.onloadeddata = () => resolve(video);
    video.onerror = () =>
      reject(
        new PoseAnalysisError("This video could not be opened in the browser."),
      );
  });
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = time;
  });
}

interface Frame {
  time: number;
  points: Point[]; // pixel coordinates
}

function seen(frame: Frame, indices: readonly number[]): boolean {
  return indices.every(
    (i) => frame.points[i] && frame.points[i].visibility >= MIN_VISIBILITY,
  );
}

const STATUS: Record<Grade, MetricStatus> = {
  good: "good",
  caution: "attention",
  poor: "warning",
};
const WORD: Record<Grade, string> = {
  good: "Good",
  caution: "Caution",
  poor: "Poor",
};

function metric(
  id: string,
  label: string,
  value: number,
  unit: string,
  band: Band,
  explain: string,
): MovementMetric {
  const grade = gradeFor(value, band);
  return {
    id: `${POSE_METRIC_PREFIX}${id}`,
    label,
    score: scoreFor(value, band),
    status: STATUS[grade],
    description: `Measured ${value.toFixed(1)}${unit} (${WORD[grade]}). ${explain}`,
  };
}

function drawKeyFrame(
  video: HTMLVideoElement,
  frame: Frame,
  flagged: number[],
): string | null {
  const canvas = document.createElement("canvas");
  const scale = Math.min(
    1,
    720 / Math.max(video.videoWidth, video.videoHeight),
  );
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const bones: [number, number][] = [
    [LM.leftShoulder, LM.rightShoulder],
    [LM.leftShoulder, LM.leftHip],
    [LM.rightShoulder, LM.rightHip],
    [LM.leftHip, LM.rightHip],
    [LM.leftHip, LM.leftKnee],
    [LM.leftKnee, LM.leftAnkle],
    [LM.rightHip, LM.rightKnee],
    [LM.rightKnee, LM.rightAnkle],
    [LM.leftAnkle, LM.leftFootIndex],
    [LM.rightAnkle, LM.rightFootIndex],
  ];
  ctx.lineWidth = Math.max(2, canvas.width / 240);
  ctx.strokeStyle = "rgba(120, 220, 255, 0.95)";
  for (const [a, b] of bones) {
    const p = frame.points[a];
    const q = frame.points[b];
    if (
      !p ||
      !q ||
      p.visibility < MIN_VISIBILITY ||
      q.visibility < MIN_VISIBILITY
    )
      continue;
    ctx.beginPath();
    ctx.moveTo(p.x * scale, p.y * scale);
    ctx.lineTo(q.x * scale, q.y * scale);
    ctx.stroke();
  }
  for (const i of flagged) {
    const p = frame.points[i];
    if (!p) continue;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 80, 80, 0.95)";
    ctx.arc(
      p.x * scale,
      p.y * scale,
      Math.max(6, canvas.width / 70),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function analyzeMovementVideo(
  input: PoseAnalysisInput,
): Promise<PoseAnalysisResult> {
  const url = URL.createObjectURL(input.file);
  try {
    const [landmarker, video] = await Promise.all([
      getLandmarker(),
      loadVideo(url),
    ]);
    const duration = Math.min(video.duration || 0, MAX_SECONDS);
    if (!duration)
      throw new PoseAnalysisError(
        "This video has no length the browser can read.",
      );

    const frames: Frame[] = [];
    const total = Math.max(1, Math.floor(duration * SAMPLE_FPS));
    for (let i = 0; i < total; i += 1) {
      const t = (i / SAMPLE_FPS) % duration;
      await seek(video, t);
      lastTimestamp += 1000 / SAMPLE_FPS;
      const result = landmarker.detectForVideo(video, lastTimestamp);
      const pose = result.landmarks[0];
      if (pose) {
        frames.push({
          time: t,
          points: pose.map((p) => ({
            x: p.x * video.videoWidth,
            y: p.y * video.videoHeight,
            visibility: p.visibility ?? 0,
          })),
        });
      }
      input.onProgress?.((i + 1) / total);
    }

    const usable = frames.filter((f) => seen(f, LOWER_BODY));
    if (usable.length < Math.max(5, total * 0.25)) {
      throw new PoseAnalysisError(
        "We couldn’t see your hips, knees and ankles clearly enough. Film the whole body, head to feet, in good light, and try again.",
      );
    }

    const views = usable
      .filter((f) => seen(f, [LM.leftShoulder, LM.rightShoulder]))
      .map((f) =>
        detectView(
          f.points[LM.leftHip],
          f.points[LM.rightHip],
          f.points[LM.leftShoulder],
          f.points[LM.rightShoulder],
        ),
      );
    const view: CameraView =
      views.filter((v) => v === "front").length >= views.length / 2
        ? "front"
        : "side";

    // The loaded part of the movement: frames where the hips are in the lowest
    // 30% of their range (image y grows downward).
    const hipY = (f: Frame) =>
      (f.points[LM.leftHip].y + f.points[LM.rightHip].y) / 2;
    const ys = usable.map(hipY);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const loaded = usable.filter(
      (f) => hipY(f) >= bottom - (bottom - top) * 0.3,
    );
    const deepest = usable.reduce((a, b) => (hipY(b) > hipY(a) ? b : a));

    const metrics: MovementMetric[] = [];
    const observations: string[] = [];
    const recommendations: string[] = [];
    let keyFrame: Frame = deepest;
    let flagged: number[] = [];

    const flexL = Math.max(
      ...loaded.map((f) =>
        kneeFlexion(
          f.points[LM.leftHip],
          f.points[LM.leftKnee],
          f.points[LM.leftAnkle],
        ),
      ),
    );
    const flexR = Math.max(
      ...loaded.map((f) =>
        kneeFlexion(
          f.points[LM.rightHip],
          f.points[LM.rightKnee],
          f.points[LM.rightAnkle],
        ),
      ),
    );

    if (view === "front") {
      const midline = (f: Frame) =>
        (f.points[LM.leftHip].x + f.points[LM.rightHip].x) / 2;
      const fppa = (f: Frame, side: "left" | "right") =>
        side === "left"
          ? frontalKneeAngle(
              f.points[LM.leftHip],
              f.points[LM.leftKnee],
              f.points[LM.leftAnkle],
              midline(f),
            )
          : frontalKneeAngle(
              f.points[LM.rightHip],
              f.points[LM.rightKnee],
              f.points[LM.rightAnkle],
              midline(f),
            );
      const peak = (side: "left" | "right") =>
        loaded.reduce(
          (best, f) => (fppa(f, side) > fppa(best, side) ? f : best),
          loaded[0],
        );
      const peakL = peak("left");
      const peakR = peak("right");
      const valL = Math.max(0, fppa(peakL, "left"));
      const valR = Math.max(0, fppa(peakR, "right"));
      const worse = valL >= valR ? "left" : "right";
      keyFrame = worse === "left" ? peakL : peakR;
      flagged = [worse === "left" ? LM.leftKnee : LM.rightKnee];

      metrics.push(
        metric(
          "knee-in-left",
          "Left knee alignment",
          valL,
          "° inward",
          BANDS.frontalKnee,
          "How far the left knee moved toward the midline at its worst moment, from the front.",
        ),
        metric(
          "knee-in-right",
          "Right knee alignment",
          valR,
          "° inward",
          BANDS.frontalKnee,
          "How far the right knee moved toward the midline at its worst moment, from the front.",
        ),
        metric(
          "knee-symmetry",
          "Left vs right knee control",
          Math.abs(valL - valR),
          "° difference",
          BANDS.asymmetry,
          "The gap between the two knees. Big gaps mean one side is doing more of the work.",
        ),
      );
      observations.push(
        `The ${worse} knee moved inward the most, ${Math.max(valL, valR).toFixed(1)}° at ${keyFrame.time.toFixed(2)}s. The key frame below is that moment.`,
      );
      if (gradeFor(Math.max(valL, valR), BANDS.frontalKnee) !== "good") {
        recommendations.push(
          `Practice slow landings and squats while keeping the ${worse} knee over the middle of the foot. Filming again after a week shows whether it changed.`,
        );
      }
    } else {
      const band =
        input.movementType === "squat"
          ? BANDS.squatFlexion
          : BANDS.landingFlexion;
      const deep = Math.max(flexL, flexR);
      const lean = trunkLean(
        deepest.points[LM.leftShoulder],
        deepest.points[LM.rightShoulder],
        deepest.points[LM.leftHip],
        deepest.points[LM.rightHip],
      );
      keyFrame = deepest;
      flagged = [LM.leftKnee, LM.rightKnee];
      metrics.push(
        metric(
          "knee-bend",
          "Knee bend at the deepest point",
          deep,
          "°",
          band,
          input.movementType === "squat"
            ? "How far the knees bent at the bottom of the squat, from the side."
            : "How much the knees bent to absorb the landing. Stiff landings put more load through the joints.",
        ),
        metric(
          "trunk-lean",
          "Trunk lean",
          lean,
          "° from vertical",
          BANDS.trunkLean,
          "How far the chest tipped forward at the deepest point.",
        ),
      );
      observations.push(
        `Deepest point at ${deepest.time.toFixed(2)}s: knees bent ${deep.toFixed(1)}°, trunk ${lean.toFixed(1)}° from vertical.`,
      );
      if (gradeFor(deep, band) !== "good") {
        recommendations.push(
          "Land and squat softer and deeper: knees and hips bending together, chest up.",
        );
      }
      recommendations.push(
        "Film once from the front too, so knee alignment can be measured.",
      );
    }

    const tracked = usable.length / total;
    metrics.push({
      id: `${POSE_METRIC_PREFIX}tracking`,
      label: "Tracking quality",
      score: Math.round(tracked * 100),
      status:
        tracked >= 0.8 ? "good" : tracked >= 0.5 ? "attention" : "warning",
      description: `Hips, knees and ankles were clearly visible in ${usable.length} of ${total} frames analyzed. Higher is more trustworthy.`,
    });

    const graded = metrics.filter(
      (m) => m.id !== `${POSE_METRIC_PREFIX}tracking`,
    );
    const overallScore = Math.round(
      graded.reduce((s, m) => s + m.score, 0) / graded.length,
    );
    observations.push(
      `Filmed from the ${view}. ${usable.length} frames were usable out of ${total}.`,
    );
    recommendations.push(
      "Stop if the movement causes pain, and see a qualified professional about any pain or injury.",
    );

    const name =
      input.movementType === "custom"
        ? input.customMovementName?.trim() || "movement"
        : input.movementType;
    const worst = graded.reduce((a, b) => (b.score < a.score ? b : a));
    const summary =
      `Measured from your video with on-device pose tracking (${view} view, ${usable.length} frames). ` +
      `Lowest measurement for this ${name}: ${worst.label.toLowerCase()}, ${worst.description.split(". ")[0].replace("Measured ", "")}. ` +
      "2D estimates for education only, not a medical assessment.";

    const image = drawKeyFrame(video, keyFrame, flagged);

    const report: MovementReport = {
      id: createReportId(),
      userId: input.userId,
      createdAt: new Date().toISOString(),
      movementType: input.movementType,
      customMovementName:
        input.movementType === "custom"
          ? input.customMovementName?.trim()
          : undefined,
      fileName: input.file.name,
      fileType: input.file.type,
      fileSize: input.file.size,
      status: "completed",
      overallScore,
      summary,
      metrics,
      observations,
      recommendations,
      notes: input.notes?.trim() || undefined,
    };
    return {
      report,
      keyFrame: image,
      view,
      framesUsed: usable.length,
      framesSampled: total,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

