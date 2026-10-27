import type { PoseFrame, PoseSequence, CameraView } from '../types/pose';
import { LM } from '../types/pose';

/*
 * Pure biomechanics math over pose landmarks. No DOM, no MediaPipe, no
 * side effects — every function here is unit-testable with synthetic
 * points, which is how the angle maths is verified without video.
 *
 * Coordinates are image pixels with y growing DOWNWARD. All angles are in
 * degrees.
 *
 * What a single 2-D camera can and cannot measure is the whole design
 * constraint of this file: angles and ratios in the camera's plane are
 * real; anything out of plane, anything in millimetres, and anything
 * requiring foot-arch landmarks is not available and is deliberately not
 * estimated.
 */

export interface Point {
  x: number;
  y: number;
}

export type Side = 'left' | 'right';
export type Confidence = 'high' | 'medium' | 'low';

const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ---------- angles ----------

// Interior angle at `vertex` formed by the rays to `a` and `b`. A straight
// line returns 180; degenerate input (coincident points) also returns 180
// so a bad frame reads as "no flexion" rather than a spurious bend.
export function angleAtVertex(a: Point, vertex: Point, b: Point): number {
  const ax = a.x - vertex.x;
  const ay = a.y - vertex.y;
  const bx = b.x - vertex.x;
  const by = b.y - vertex.y;
  const magA = Math.hypot(ax, ay);
  const magB = Math.hypot(bx, by);
  if (magA === 0 || magB === 0) return 180;
  const cosine = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (magA * magB)));
  return toDegrees(Math.acos(cosine));
}

// Knee flexion: 0 when the leg is straight, ~90 at a parallel squat.
export function kneeFlexion(hip: Point, knee: Point, ankle: Point): number {
  return 180 - angleAtVertex(hip, knee, ankle);
}

// Angle of the segment top→bottom away from vertical (0 = perfectly upright).
export function angleFromVertical(top: Point, bottom: Point): number {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  if (dx === 0 && dy === 0) return 0;
  return toDegrees(Math.atan2(Math.abs(dx), Math.abs(dy)));
}

// Angle of the segment a→b away from horizontal (0 = perfectly level).
export function angleFromHorizontal(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return 0;
  return toDegrees(Math.atan2(Math.abs(dy), Math.abs(dx)));
}

/*
 * Frontal Plane Projection Angle (FPPA) — the standard 2-D knee-valgus
 * measure. It is the deviation of the knee from the straight hip→ankle
 * line, signed so that POSITIVE means the knee sits medially (toward the
 * body's midline — valgus) and NEGATIVE means laterally (varus).
 *
 * `midlineX` is the x position of the hip midpoint; it tells the function
 * which direction counts as "inward" for this leg.
 */
export function frontalPlaneProjectionAngle(
  hip: Point,
  knee: Point,
  ankle: Point,
  midlineX: number,
): number {
  const deviation = 180 - angleAtVertex(hip, knee, ankle);

  // Project the knee onto the hip→ankle line and see which side it falls on.
  const vx = ankle.x - hip.x;
  const vy = ankle.y - hip.y;
  const lengthSquared = vx * vx + vy * vy || 1;
  const t = ((knee.x - hip.x) * vx + (knee.y - hip.y) * vy) / lengthSquared;
  const projectedX = hip.x + t * vx;
  const offsetX = knee.x - projectedX;
  const towardMidline = midlineX - knee.x;

  const isMedial = offsetX * towardMidline > 0;
  return isMedial ? deviation : -deviation;
}

/*
 * Frontal shank angle — the valgus measure this app actually reports.
 *
 * FPPA (above) needs the thigh to be visible in the frontal plane. In a deep
 * squat seen from the front, the thigh points at the camera and its
 * projection collapses to almost nothing, so FPPA explodes into meaningless
 * values. The shank (knee→ankle) stays much closer to the frontal plane, so
 * its tilt from vertical is a stable 2-D proxy for how far the knee has
 * collapsed inward.
 *
 * Signed POSITIVE when the knee sits closer to the body's midline than the
 * ankle (medial — valgus), NEGATIVE when further away (varus). Using
 * distance-from-midline rather than left/right makes the sign correct
 * whether the person faces toward or away from the camera.
 */
export function frontalShankAngle(knee: Point, ankle: Point, midlineX: number): number {
  const magnitude = angleFromVertical(knee, ankle);
  const kneeOffset = Math.abs(knee.x - midlineX);
  const ankleOffset = Math.abs(ankle.x - midlineX);
  return kneeOffset < ankleOffset ? magnitude : -magnitude;
}

// ---------- landmark access ----------

export function point(frame: PoseFrame, index: number): Point {
  const landmark = frame.landmarks[index];
  return { x: landmark.x, y: landmark.y };
}

export function meanVisibility(frames: PoseFrame[], indices: readonly number[]): number {
  if (frames.length === 0) return 0;
  let total = 0;
  let count = 0;
  for (const frame of frames) {
    for (const index of indices) {
      total += frame.landmarks[index]?.visibility ?? 0;
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
}

export function confidenceFromVisibility(visibility: number): Confidence {
  if (visibility >= 0.75) return 'high';
  if (visibility >= 0.5) return 'medium';
  return 'low';
}

// Landmarks that must be reasonably visible for a side's leg to be measured.
export function legIndices(side: Side): readonly number[] {
  return side === 'left'
    ? [LM.leftHip, LM.leftKnee, LM.leftAnkle]
    : [LM.rightHip, LM.rightKnee, LM.rightAnkle];
}

// In a side view one leg is partly hidden behind the other. Measure the
// one the model saw more clearly.
export function nearerSide(frames: PoseFrame[]): Side {
  const left = meanVisibility(frames, legIndices('left'));
  const right = meanVisibility(frames, legIndices('right'));
  return left >= right ? 'left' : 'right';
}

// ---------- statistics ----------

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[index];
}

export function max(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Shoulder midpoint → hip midpoint.
export function torsoSegment(frame: PoseFrame): [Point, Point] {
  return [
    midpoint(point(frame, LM.leftShoulder), point(frame, LM.rightShoulder)),
    midpoint(point(frame, LM.leftHip), point(frame, LM.rightHip)),
  ];
}

// ---------- camera view ----------

export interface ViewClassification {
  view: CameraView;
  // How decisively the footage looks like that view (0–1). Low values mean
  // an oblique angle where in-plane measurements become unreliable.
  confidence: number;
  shoulderWidthRatio: number;
}

/*
 * Front vs side is decided by how wide the shoulders appear relative to
 * torso length. Facing the camera the ratio is large (~0.5+); from the side
 * the shoulders overlap and it collapses (~0.15). The threshold sits in the
 * gap; distance from it becomes the confidence.
 */
export function classifyView(sequence: PoseSequence): ViewClassification {
  const ratios = sequence.frames.map((frame) => {
    const ls = point(frame, LM.leftShoulder);
    const rs = point(frame, LM.rightShoulder);
    const lh = point(frame, LM.leftHip);
    const rh = point(frame, LM.rightHip);
    const torso = distance(midpoint(ls, rs), midpoint(lh, rh)) || 1;
    return Math.abs(ls.x - rs.x) / torso;
  });
  const ratio = median(ratios);
  const threshold = 0.35;
  const view: CameraView = ratio > threshold ? 'front' : 'side';
  // Measured on real footage: squarely-front clips sit at ~0.5–0.6, a true
  // side clip at ~0.23, so 0.2 either side of the threshold is "certain".
  const confidence = Math.min(1, Math.abs(ratio - threshold) / 0.2);
  return { view, confidence, shoulderWidthRatio: ratio };
}

/*
 * Camera-yaw estimate for a front-view clip, from the trunk alone.
 *
 * If the camera is rotated by θ from square-on, a trunk pitched forward by
 * φ (with no real sideways lean) appears to lean sideways by λ, where
 * tan λ = tan φ · sin θ, and its projected length shrinks to r = cos φ /
 * cos λ. The two observations (r, λ) in a frame therefore give θ. Only
 * frames with a real forward pitch carry information, so a clip in which
 * the trunk never pitches (a very upright jump, walking) returns null —
 * "can't tell".
 *
 * A genuine sideways lean also raises the estimate, so this is an upper
 * bound: a real 15° lean at the bottom of a deep squat reads as about 17°,
 * and callers treat anything under 20° as square.
 */
export function estimateFrontYaw(frames: PoseFrame[]): number | null {
  const lengths = frames.map((frame) => {
    const [top, bottom] = torsoSegment(frame);
    return distance(top, bottom);
  });
  const reference = percentile(lengths, 90);
  if (reference === 0) return null;

  const estimates: number[] = [];
  frames.forEach((frame, index) => {
    const r = Math.min(1, lengths[index] / reference);
    if (r > 0.95) return; // too upright to carry information
    const [top, bottom] = torsoSegment(frame);
    const lambda = (angleFromVertical(top, bottom) * Math.PI) / 180;
    const phi = Math.acos(Math.min(1, r * Math.cos(lambda)));
    if (phi < (15 * Math.PI) / 180) return;
    const sinTheta = Math.min(1, Math.max(0, Math.tan(lambda) / Math.tan(phi)));
    estimates.push(toDegrees(Math.asin(sinTheta)));
  });
  if (estimates.length < 6) return null;
  return median(estimates);
}

// ---------- gait ----------

// Where the floor is, in image y: feet spend most of the time on it, so the
// high percentile of the lowest ankle is a robust estimate.
export function groundLevelY(frames: PoseFrame[]): number {
  const lowest = frames.map((frame) =>
    Math.max(frame.landmarks[LM.leftAnkle].y, frame.landmarks[LM.rightAnkle].y),
  );
  return percentile(lowest, 90);
}

export function isOnGround(ankleY: number, groundY: number, toleranceHeightFraction: number, frameHeight: number): boolean {
  return ankleY >= groundY - toleranceHeightFraction * frameHeight;
}

/*
 * Ground contacts for one ankle: local maxima of ankle y (the lowest
 * points), separated by at least `minSpacingMs` and prominent enough to be
 * a real step rather than detector jitter.
 */
export function detectContacts(
  ys: number[],
  timestamps: number[],
  minSpacingMs: number,
  minProminence: number,
): number[] {
  const contacts: number[] = [];
  for (let i = 1; i < ys.length - 1; i += 1) {
    if (ys[i] < ys[i - 1] || ys[i] < ys[i + 1]) continue;
    // Prominence: how far this peak rises above the nearest valleys.
    let left = ys[i];
    for (let j = i - 1; j >= 0 && ys[j] <= ys[i]; j -= 1) left = Math.min(left, ys[j]);
    let right = ys[i];
    for (let j = i + 1; j < ys.length && ys[j] <= ys[i]; j += 1) right = Math.min(right, ys[j]);
    if (ys[i] - Math.max(left, right) < minProminence) continue;
    const last = contacts[contacts.length - 1];
    if (last !== undefined && timestamps[i] - timestamps[last] < minSpacingMs) continue;
    contacts.push(i);
  }
  return contacts;
}

// Steps per minute from both ankles, or null when the clip is too short to
// say anything honest.
export function cadenceStepsPerMinute(sequence: PoseSequence): number | null {
  const { frames, height } = sequence;
  if (frames.length < 8) return null;
  const timestamps = frames.map((f) => f.timestampMs);
  const durationMs = timestamps[timestamps.length - 1] - timestamps[0];
  if (durationMs < 1500) return null;

  const prominence = 0.015 * height;
  const left = detectContacts(frames.map((f) => f.landmarks[LM.leftAnkle].y), timestamps, 250, prominence);
  const right = detectContacts(frames.map((f) => f.landmarks[LM.rightAnkle].y), timestamps, 250, prominence);
  const steps = left.length + right.length;
  if (steps < 3) return null;
  return (steps / (durationMs / 1000)) * 60;
}

/*
 * Frames in which a body segment is long enough ON SCREEN to measure.
 *
 * A segment pointing toward the camera projects short, and any angle read
 * from it is mostly noise (a trunk pitched 75° forward looks 4× shorter
 * from the front, so a tiny sideways offset reads as a huge "lateral lean").
 * The reference length is the 90th percentile over the clip — roughly the
 * segment's length when the person is upright — and frames below
 * `minFraction` of it are skipped rather than measured badly.
 */
export function framesWithVisibleSegment(
  frames: PoseFrame[],
  segment: (frame: PoseFrame) => [Point, Point],
  minFraction: number,
): PoseFrame[] {
  if (frames.length === 0) return frames;
  const lengths = frames.map((frame) => {
    const [a, b] = segment(frame);
    return distance(a, b);
  });
  const reference = percentile(lengths, 90);
  if (reference === 0) return [];
  return frames.filter((_, index) => lengths[index] >= minFraction * reference);
}

// Frames in which the given ankle is on the ground (stance phase).
export function stanceFrames(sequence: PoseSequence, side: Side): PoseFrame[] {
  const groundY = groundLevelY(sequence.frames);
  const ankle = side === 'left' ? LM.leftAnkle : LM.rightAnkle;
  return sequence.frames.filter((frame) =>
    isOnGround(frame.landmarks[ankle].y, groundY, 0.03, sequence.height),
  );
}

// ---------- landing ----------

export interface LandingContact {
  index: number;
  flexionAtContact: number;
  additionalFlexion: number;
}

/*
 * For a jump/landing side view: the body rises (hip y falls), then the feet
 * come back down to the floor. Contact is the first frame after the apex
 * where an ankle reaches ground level. Absorption is how much more the knee
 * bends in the ~0.6 s after contact.
 */
export function detectLanding(sequence: PoseSequence, side: Side): LandingContact | null {
  const { frames, height } = sequence;
  if (frames.length < 5) return null;
  const hipMidY = frames.map((f) => (f.landmarks[LM.leftHip].y + f.landmarks[LM.rightHip].y) / 2);
  let apex = 0;
  for (let i = 1; i < hipMidY.length; i += 1) if (hipMidY[i] < hipMidY[apex]) apex = i;

  const groundY = groundLevelY(frames);
  const ankle = side === 'left' ? LM.leftAnkle : LM.rightAnkle;
  let contact = -1;
  for (let i = apex + 1; i < frames.length; i += 1) {
    if (isOnGround(frames[i].landmarks[ankle].y, groundY, 0.03, height)) {
      contact = i;
      break;
    }
  }
  if (contact === -1) return null;

  const [hipIdx, kneeIdx, ankleIdx] = legIndices(side);
  const flexionAt = (frame: PoseFrame) =>
    kneeFlexion(point(frame, hipIdx), point(frame, kneeIdx), point(frame, ankleIdx));
  const flexionAtContact = flexionAt(frames[contact]);
  const windowEnd = frames[contact].timestampMs + 600;
  let peak = flexionAtContact;
  for (let i = contact; i < frames.length && frames[i].timestampMs <= windowEnd; i += 1) {
    peak = Math.max(peak, flexionAt(frames[i]));
  }
  return { index: contact, flexionAtContact, additionalFlexion: peak - flexionAtContact };
}

// ---------- scoring ----------

// Scores map onto the app's fixed bands: good ≥ 80, attention 65–79,
// warning < 65. The helpers interpolate within each band so two values in
// the same band still rank sensibly.

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function scoreLowerIsBetter(
  value: number,
  goodMax: number,
  attentionMax: number,
  worstAt: number,
): number {
  if (value <= goodMax) return Math.round(95 - 15 * clamp(value / goodMax, 0, 1));
  if (value <= attentionMax) {
    return Math.round(79 - 14 * clamp((value - goodMax) / (attentionMax - goodMax), 0, 1));
  }
  return Math.round(64 - 24 * clamp((value - attentionMax) / (worstAt - attentionMax), 0, 1));
}

export function scoreHigherIsBetter(
  value: number,
  goodMin: number,
  attentionMin: number,
  worstAt: number,
): number {
  if (value >= goodMin) return Math.round(80 + 15 * clamp((value - goodMin) / Math.max(1, goodMin * 0.3), 0, 1));
  if (value >= attentionMin) {
    return Math.round(65 + 14 * clamp((value - attentionMin) / (goodMin - attentionMin), 0, 1));
  }
  return Math.round(40 + 24 * clamp((value - worstAt) / (attentionMin - worstAt), 0, 1));
}

// For quantities with an ideal window (cadence): full marks inside it,
// decaying with distance outside.
export function scoreInRange(
  value: number,
  idealMin: number,
  idealMax: number,
  attentionPad: number,
  worstPad: number,
): number {
  const outside = value < idealMin ? idealMin - value : value > idealMax ? value - idealMax : 0;
  return scoreLowerIsBetter(outside, attentionPad * 0.5, attentionPad, worstPad);
}

export function statusFromScore(score: number): 'good' | 'attention' | 'warning' {
  if (score >= 80) return 'good';
  if (score >= 65) return 'attention';
  return 'warning';
}
