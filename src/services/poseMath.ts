/*
 * Pure geometry for the real (pose-tracked) analysis. No DOM, no model, so it
 * can be tested on its own (scripts/test-pose-math.mjs).
 *
 * Every number here is measured from 2D landmarks in one camera view, so it is
 * an estimate. The grade bands below are rough screening bands for education,
 * not clinical cutoffs.
 */

export interface Point {
  x: number;
  y: number;
  visibility: number;
}

// MediaPipe Pose landmark indices. "Left" is the athlete's own left.
export const POSE_METRIC_PREFIX = 'pose-';

// Reports from the real tracker carry metric ids that start w POSE_METRIC_PREFIX.
export function isMeasuredReport(report: { metrics: { id: string }[] }): boolean {
  return report.metrics.some((m) => m.id.startsWith(POSE_METRIC_PREFIX));
}

export const LM = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

export const LOWER_BODY = [
  LM.leftHip,
  LM.rightHip,
  LM.leftKnee,
  LM.rightKnee,
  LM.leftAnkle,
  LM.rightAnkle,
];

export type CameraView = "front" | "side";
export type Grade = "good" | "caution" | "poor";

const toDeg = (rad: number) => (rad * 180) / Math.PI;

// Interior angle at b, in degrees, for the path a -> b -> c.
export function jointAngle(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (mag === 0) return 180;
  return toDeg(Math.acos(Math.min(1, Math.max(-1, dot / mag))));
}

// Knee flexion: 0 when the leg is straight, larger when bent.
export function kneeFlexion(hip: Point, knee: Point, ankle: Point): number {
  return 180 - jointAngle(hip, knee, ankle);
}

/*
 * Frontal plane projection angle (FPPA) for one leg, filmed from the front.
 * Positive means the knee sits toward the body's midline relative to the
 * hip-to-ankle line (knee caving in). Negative means it sits outward.
 */
export function frontalKneeAngle(
  hip: Point,
  knee: Point,
  ankle: Point,
  midlineX: number,
): number {
  const deviation = 180 - jointAngle(hip, knee, ankle);
  // x of the hip-ankle line at the knee's height
  const t = ankle.y === hip.y ? 0.5 : (knee.y - hip.y) / (ankle.y - hip.y);
  const lineX = hip.x + t * (ankle.x - hip.x);
  const towardMidline =
    Math.abs(knee.x - midlineX) < Math.abs(lineX - midlineX);
  return towardMidline ? deviation : -deviation;
}

// Trunk lean from vertical, using shoulder and hip midpoints.
export function trunkLean(
  lShoulder: Point,
  rShoulder: Point,
  lHip: Point,
  rHip: Point,
): number {
  const sx = (lShoulder.x + rShoulder.x) / 2;
  const sy = (lShoulder.y + rShoulder.y) / 2;
  const hx = (lHip.x + rHip.x) / 2;
  const hy = (lHip.y + rHip.y) / 2;
  return toDeg(Math.atan2(Math.abs(sx - hx), Math.abs(hy - sy)));
}

/*
 * Front or side view, from how wide the hips look next to the torso.
 * From the front the hips span a good part of the torso length; from the side
 * they nearly overlap. The 0.22 cutoff is guessed, never measured: check it
 * against real front and side clips before trusting it.
 */
export function detectView(
  lHip: Point,
  rHip: Point,
  lShoulder: Point,
  rShoulder: Point,
): CameraView {
  const hipWidth = Math.abs(lHip.x - rHip.x);
  const torso = Math.hypot(
    (lShoulder.x + rShoulder.x) / 2 - (lHip.x + rHip.x) / 2,
    (lShoulder.y + rShoulder.y) / 2 - (lHip.y + rHip.y) / 2,
  );
  if (torso === 0) return "front";
  return hipWidth / torso > 0.22 ? "front" : "side";
}

export interface Band {
  good: number; // at or better than this is good
  poor: number; // at or worse than this is poor
  higherIsBetter: boolean;
}

export function gradeFor(value: number, band: Band): Grade {
  if (band.higherIsBetter) {
    if (value >= band.good) return "good";
    if (value <= band.poor) return "poor";
    return "caution";
  }
  if (value <= band.good) return "good";
  if (value >= band.poor) return "poor";
  return "caution";
}

// 0 to 100, continuous inside each band, so the score moves with the measurement.
// good maps to 80 to 98, caution 65 to 79, poor 40 to 64.
export function scoreFor(value: number, band: Band): number {
  const { good, poor, higherIsBetter } = band;
  const span = Math.abs(good - poor) || 1;
  // progress: 0 at the poor line, 1 at the good line
  const p = higherIsBetter ? (value - poor) / span : (poor - value) / span;
  let score: number;
  if (p >= 1) score = 80 + Math.min(18, (p - 1) * 36);
  else if (p <= 0) score = 64 + Math.max(-24, p * 48);
  else score = 65 + p * 14;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export const BANDS = {
  // Knee caving in, front view. Rough screening band.
  frontalKnee: { good: 8, poor: 15, higherIsBetter: false } as Band,
  // Left vs right difference in the same measurement
  asymmetry: { good: 5, poor: 10, higherIsBetter: false } as Band,
  // Trunk lean from vertical at the deepest point
  trunkLean: { good: 30, poor: 45, higherIsBetter: false } as Band,
  // Knee bend at the deepest point of a landing (stiff landings score low)
  landingFlexion: { good: 60, poor: 40, higherIsBetter: true } as Band,
  // Knee bend at the bottom of a squat
  squatFlexion: { good: 90, poor: 70, higherIsBetter: true } as Band,
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
