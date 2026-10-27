import type {
  MovementMetric,
  MovementReport,
  MovementType,
} from '../types/report';
import type { PoseFrame, PoseSequence } from '../types/pose';
import { LM } from '../types/pose';
import { createReportId } from './reportStorage';
import {
  angleFromHorizontal,
  angleFromVertical,
  cadenceStepsPerMinute,
  classifyView,
  confidenceFromVisibility,
  detectLanding,
  estimateFrontYaw,
  framesWithVisibleSegment,
  frontalShankAngle,
  kneeFlexion,
  legIndices,
  meanVisibility,
  median,
  midpoint,
  nearerSide,
  percentile,
  point,
  round,
  scoreHigherIsBetter,
  scoreInRange,
  scoreLowerIsBetter,
  stanceFrames,
  statusFromScore,
  torsoSegment,
} from './biomechanics';
import type { Confidence, Point, Side } from './biomechanics';

/*
 * Automated movement screening from two videos: one filmed from the FRONT
 * and one from the SIDE.
 *
 * Each camera angle measures only what lies in its plane. The front view
 * gives knee valgus, pelvic tilt, and lateral trunk lean. The side view
 * gives knee flexion (depth, landing stiffness), forward trunk lean, and
 * cadence. Nothing is estimated out of plane, nothing is reported in
 * millimetres (a single camera has no scale), and the foot arch is not
 * measured because the pose model has no arch landmarks. Fewer metrics, all
 * of them real.
 *
 * Two lessons from real footage shape this file:
 *
 *  1. Foreshortening. A body segment pointed at the camera projects short,
 *     and angles read from it are noise. Every frontal-plane metric gates
 *     its frames on projected segment length (see framesWithVisibleSegment).
 *
 *  2. Camera yaw. A "front" video filmed from a corner makes forward lean
 *     during a squat appear as sideways lean, pelvic tilt, and a left/right
 *     knee difference. The engine estimates the yaw from the trunk, drops
 *     the measurements that yaw would fake, and measures knee valgus from
 *     both knees together, which cancels the yaw artifact to first order.
 *     Left/right valgus asymmetry from a bilateral movement is NOT reported:
 *     on the test footage it was dominated by camera angle, not the knees.
 *
 * This is still educational screening, not a medical assessment, and every
 * metric carries a confidence derived from how clearly the model saw the
 * joints involved.
 */

export interface AnalyzedVideo {
  fileName: string;
  fileType: string;
  fileSize?: number;
  sequence: PoseSequence;
}

export interface MovementAnalysisInput {
  movementType: MovementType;
  customMovementName?: string;
  notes?: string;
  userId: string | null;
  front: AnalyzedVideo;
  side: AnalyzedVideo;
}

export type AnalysisErrorCode =
  | 'no-person-front'
  | 'no-person-side'
  | 'too-little-front'
  | 'too-little-side'
  | 'front-looks-like-side'
  | 'side-looks-like-front';

export class AnalysisError extends Error {
  code: AnalysisErrorCode;
  constructor(code: AnalysisErrorCode) {
    super(`analysis:${code}`);
    this.name = 'AnalysisError';
    this.code = code;
  }
}

// A person must be found in at least this fraction of sampled frames for a
// video to be usable at all.
const MIN_DETECTED_FRACTION = 0.4;
const MIN_FRAMES = 6;

// "Peak" throughout means the 95th percentile over the measured frames: a
// single mis-detected frame must never define a metric.
const PEAK = 95;

// Front-camera yaw (degrees) beyond which sideways-lean and pelvic-tilt
// readings are mostly camera angle, and below which they merely lose
// confidence.
const YAW_UNRELIABLE = 20;
const YAW_CAUTION = 10;

// ---------- metric construction ----------

interface MetricSpec {
  key: string;
  label: string;
  value: number;
  unit: string;
  score: number;
  view: 'front' | 'side';
  confidence: Confidence;
  explanation: string;
  bands: string;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

function capConfidence(confidence: Confidence, cap: Confidence): Confidence {
  return CONFIDENCE_RANK[confidence] <= CONFIDENCE_RANK[cap] ? confidence : cap;
}

function buildMetric(movementType: MovementType, spec: MetricSpec): MovementMetric {
  const confidenceNote =
    spec.confidence === 'low'
      ? ' Confidence is low because the joints involved were not clearly visible or the camera angle was off — treat this value as rough.'
      : spec.confidence === 'medium'
        ? ' Confidence is medium.'
        : ' Confidence is high.';
  return {
    id: `${movementType}-${spec.key}`,
    label: spec.label,
    score: spec.score,
    status: statusFromScore(spec.score),
    description:
      `Measured ${round(spec.value)}${spec.unit} from the ${spec.view} video — ${spec.explanation} ` +
      `Screening bands: ${spec.bands}.${confidenceNote}`,
    value: round(spec.value),
    unit: spec.unit,
    confidence: spec.confidence,
  };
}

const VALGUS_BANDS = 'below 8° good, 8–10° review, 10°+ needs attention';

// What the front camera could tell us about itself.
interface FrontGeometry {
  yaw: number | null; // null = clip too upright to estimate
}

function yawConfidenceCap(geometry: FrontGeometry): Confidence {
  if (geometry.yaw === null) return 'high';
  if (geometry.yaw >= YAW_UNRELIABLE) return 'low';
  if (geometry.yaw >= YAW_CAUTION) return 'medium';
  return 'high';
}

// ---------- front-view measurements ----------

function hipMidlineX(frame: PoseFrame): number {
  return midpoint(point(frame, LM.leftHip), point(frame, LM.rightHip)).x;
}

function shankSegment(side: Side): (frame: PoseFrame) => [Point, Point] {
  const [, knee, ankle] = legIndices(side);
  return (frame) => [point(frame, knee), point(frame, ankle)];
}

// Frames in which BOTH shins are long enough on screen to read.
function framesWithBothShins(frames: PoseFrame[]): PoseFrame[] {
  const left = new Set(framesWithVisibleSegment(frames, shankSegment('left'), 0.6));
  return framesWithVisibleSegment(frames, shankSegment('right'), 0.6).filter((f) => left.has(f));
}

function shankValgus(frame: PoseFrame, side: Side): number {
  const [, knee, ankle] = legIndices(side);
  return frontalShankAngle(point(frame, knee), point(frame, ankle), hipMidlineX(frame));
}

/*
 * Knee valgus for a bilateral movement, from both knees together. Camera yaw
 * tilts both shins the same way on screen, which reads as "medial" on one
 * leg and "lateral" on the other; averaging the two medial-positive angles
 * cancels that and leaves the genuine inward collapse.
 */
function kneeValgusMetric(frames: PoseFrame[], phase: string): MetricSpec | null {
  const visibility = meanVisibility(frames, [...legIndices('left'), ...legIndices('right')]);
  if (visibility < 0.35) return null;
  const usable = framesWithBothShins(frames);
  if (usable.length < MIN_FRAMES) return null;
  const series = usable.map((f) => (shankValgus(f, 'left') + shankValgus(f, 'right')) / 2);
  const peak = Math.max(0, percentile(series, PEAK));
  return {
    key: 'knee-valgus',
    label: 'Knee Valgus',
    value: peak,
    unit: '°',
    score: scoreLowerIsBetter(peak, 8, 10, 20),
    view: 'front',
    confidence: confidenceFromVisibility(visibility),
    explanation:
      peak < 8
        ? `the knees stayed over the ankles ${phase}, measured from both shins together.`
        : peak < 10
          ? `the knees drifted inward over the ankles ${phase}, measured from both shins together.`
          : `the knees moved clearly inward over the ankles ${phase}, measured from both shins together.`,
    bands: VALGUS_BANDS,
  };
}

// Per-leg valgus during that leg's own stance (gait only). There is no
// partner leg to cancel camera yaw against, so this is capped at medium
// confidence and says so.
function stanceValgusMetric(sequence: PoseSequence, side: Side): MetricSpec | null {
  const stance = stanceFrames(sequence, side);
  const visibility = meanVisibility(stance, legIndices(side));
  if (visibility < 0.35) return null;
  const usable = framesWithVisibleSegment(stance, shankSegment(side), 0.6);
  if (usable.length < MIN_FRAMES) return null;
  const peak = Math.max(0, percentile(usable.map((f) => shankValgus(f, side)), PEAK));
  const sideWord = side === 'left' ? 'Left' : 'Right';
  return {
    key: `${side}-stance-valgus`,
    label: `${sideWord} Knee Valgus in Stance`,
    value: peak,
    unit: '°',
    score: scoreLowerIsBetter(peak, 8, 10, 20),
    view: 'front',
    confidence: capConfidence(confidenceFromVisibility(visibility), 'medium'),
    explanation:
      (peak < 8
        ? `the ${side} knee stayed over the ankle while that foot was on the ground.`
        : peak < 10
          ? `the ${side} knee drifted inward while that foot was on the ground.`
          : `the ${side} knee moved clearly inward while that foot was on the ground.`) +
      ' Single-leg readings are sensitive to camera angle.',
    bands: VALGUS_BANDS,
  };
}

function lateralTrunkMetric(frames: PoseFrame[], geometry: FrontGeometry): MetricSpec | null {
  if (geometry.yaw !== null && geometry.yaw >= YAW_UNRELIABLE) return null;
  const indices = [LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip];
  const visibility = meanVisibility(frames, indices);
  if (visibility < 0.35 || frames.length === 0) return null;
  // Only while the trunk is within ~35° of upright; a trunk pitched toward
  // the camera is too foreshortened to read side-to-side.
  const usable = framesWithVisibleSegment(frames, torsoSegment, 0.8);
  if (usable.length < MIN_FRAMES) return null;
  const lean = percentile(
    usable.map((frame) => {
      const [top, bottom] = torsoSegment(frame);
      return angleFromVertical(top, bottom);
    }),
    PEAK,
  );
  return {
    key: 'lateral-trunk-lean',
    label: 'Lateral Trunk Control',
    value: lean,
    unit: '°',
    score: scoreLowerIsBetter(lean, 5, 10, 18),
    view: 'front',
    confidence: capConfidence(confidenceFromVisibility(visibility), yawConfidenceCap(geometry)),
    explanation:
      lean < 5
        ? 'the trunk stayed upright side to side (measured while the trunk was near upright).'
        : lean < 10
          ? 'the trunk leaned noticeably to one side at its peak (measured while the trunk was near upright).'
          : 'the trunk leaned strongly to one side at its peak (measured while the trunk was near upright).',
    bands: 'below 5° good, 5–10° review, 10°+ needs attention',
  };
}

function pelvicTiltMetric(
  frames: PoseFrame[],
  geometry: FrontGeometry,
  label: string,
): MetricSpec | null {
  if (geometry.yaw !== null && geometry.yaw >= YAW_UNRELIABLE) return null;
  const indices = [LM.leftHip, LM.rightHip];
  const visibility = meanVisibility(frames, indices);
  if (visibility < 0.35 || frames.length === 0) return null;
  // A pelvis turned away from the camera projects narrow and any vertical
  // offset between the hips then reads as a large tilt; skip those frames.
  const usable = framesWithVisibleSegment(
    frames,
    (frame) => [point(frame, LM.leftHip), point(frame, LM.rightHip)],
    0.7,
  );
  if (usable.length < MIN_FRAMES) return null;
  const tilt = percentile(
    usable.map((frame) => angleFromHorizontal(point(frame, LM.leftHip), point(frame, LM.rightHip))),
    PEAK,
  );
  return {
    key: 'pelvic-tilt',
    label,
    value: tilt,
    unit: '°',
    score: scoreLowerIsBetter(tilt, 4, 8, 14),
    view: 'front',
    confidence: capConfidence(confidenceFromVisibility(visibility), yawConfidenceCap(geometry)),
    explanation:
      tilt < 4
        ? 'the pelvis stayed level.'
        : tilt < 8
          ? 'one side of the pelvis dropped noticeably at its peak.'
          : 'one side of the pelvis dropped clearly at its peak.',
    bands: 'below 4° good, 4–8° review, 8°+ needs attention',
  };
}

// ---------- side-view measurements ----------

function flexionSeries(frames: PoseFrame[], side: Side): number[] {
  const [hip, knee, ankle] = legIndices(side);
  return frames.map((frame) => kneeFlexion(point(frame, hip), point(frame, knee), point(frame, ankle)));
}

function depthMetric(frames: PoseFrame[], side: Side, label: string): MetricSpec | null {
  const visibility = meanVisibility(frames, legIndices(side));
  if (visibility < 0.35 || frames.length === 0) return null;
  const depth = percentile(flexionSeries(frames, side), PEAK);
  return {
    key: 'knee-flexion-depth',
    label,
    value: depth,
    unit: '°',
    score: scoreHigherIsBetter(depth, 90, 70, 40),
    view: 'side',
    confidence: confidenceFromVisibility(visibility),
    explanation:
      depth >= 90
        ? 'knee bend reached roughly parallel or deeper.'
        : depth >= 70
          ? 'knee bend was moderate, short of parallel.'
          : 'knee bend was limited.',
    bands: '90°+ good, 70–90° review, below 70° needs attention',
  };
}

function forwardTrunkMetric(
  frames: PoseFrame[],
  side: Side,
  usePeak: boolean,
  goodMax: number,
  attentionMax: number,
  worstAt: number,
): MetricSpec | null {
  const shoulder = side === 'left' ? LM.leftShoulder : LM.rightShoulder;
  const hip = side === 'left' ? LM.leftHip : LM.rightHip;
  const visibility = meanVisibility(frames, [shoulder, hip]);
  if (visibility < 0.35 || frames.length === 0) return null;
  const series = frames.map((frame) => angleFromVertical(point(frame, shoulder), point(frame, hip)));
  const lean = usePeak ? percentile(series, PEAK) : median(series);
  return {
    key: 'forward-trunk-lean',
    label: 'Forward Trunk Lean',
    value: lean,
    unit: '°',
    score: scoreLowerIsBetter(lean, goodMax, attentionMax, worstAt),
    view: 'side',
    confidence: confidenceFromVisibility(visibility),
    explanation:
      lean <= goodMax
        ? 'the trunk stayed within a typical forward-lean range.'
        : lean <= attentionMax
          ? 'the trunk leaned further forward than typical at its peak.'
          : 'the trunk leaned strongly forward at its peak.',
    bands: `below ${goodMax}° good, ${goodMax}–${attentionMax}° review, ${attentionMax}°+ needs attention`,
  };
}

function cadenceMetric(
  sequence: PoseSequence,
  idealMin: number,
  idealMax: number,
): MetricSpec | null {
  const visibility = meanVisibility(sequence.frames, [LM.leftAnkle, LM.rightAnkle]);
  const cadence = cadenceStepsPerMinute(sequence);
  if (cadence === null || visibility < 0.35) return null;
  return {
    key: 'cadence',
    label: 'Cadence',
    value: cadence,
    unit: ' steps/min',
    score: scoreInRange(cadence, idealMin, idealMax, 15, 35),
    view: 'side',
    confidence: confidenceFromVisibility(visibility),
    explanation:
      cadence >= idealMin && cadence <= idealMax
        ? 'step rate sat inside a typical range for this movement.'
        : cadence < idealMin
          ? 'step rate was lower than typical, which often goes with longer strides.'
          : 'step rate was higher than typical.',
    bands: `${idealMin}–${idealMax} steps/min typical`,
  };
}

function landingMetrics(sequence: PoseSequence, side: Side): (MetricSpec | null)[] {
  const visibility = meanVisibility(sequence.frames, legIndices(side));
  const landing = detectLanding(sequence, side);
  if (!landing || visibility < 0.35) return [null, null];
  const confidence = confidenceFromVisibility(visibility);
  return [
    {
      key: 'knee-flexion-at-contact',
      label: 'Knee Bend at Contact',
      value: landing.flexionAtContact,
      unit: '°',
      score: scoreHigherIsBetter(landing.flexionAtContact, 35, 25, 10),
      view: 'side',
      confidence,
      explanation:
        landing.flexionAtContact >= 35
          ? 'the knee was already bending as the foot met the ground — a softer first contact.'
          : landing.flexionAtContact >= 25
            ? 'the knee was fairly straight at first contact.'
            : 'the knee was nearly straight at first contact — a stiff landing.',
      bands: '35°+ good, 25–35° review, below 25° needs attention',
    },
    {
      key: 'landing-absorption',
      label: 'Landing Absorption',
      value: landing.additionalFlexion,
      unit: '°',
      score: scoreHigherIsBetter(landing.additionalFlexion, 45, 30, 10),
      view: 'side',
      confidence,
      explanation:
        landing.additionalFlexion >= 45
          ? 'the knee kept bending well after contact, spreading the landing over time.'
          : landing.additionalFlexion >= 30
            ? 'the knee bent a moderate amount after contact.'
            : 'the knee bent little after contact — most of the landing was taken quickly.',
      bands: '45°+ good, 30–45° review, below 30° needs attention',
    },
  ];
}

function stanceKneeMetric(sequence: PoseSequence, side: Side): MetricSpec | null {
  const stance = stanceFrames(sequence, side);
  const visibility = meanVisibility(stance, legIndices(side));
  if (stance.length < 3 || visibility < 0.35) return null;
  // During stance the knee should be slightly bent; near-straight contact
  // is the "stiff" pattern.
  const flexion = median(flexionSeries(stance, side));
  return {
    key: 'stance-knee-flexion',
    label: 'Knee Bend in Stance',
    value: flexion,
    unit: '°',
    score: scoreHigherIsBetter(flexion, 15, 8, 0),
    view: 'side',
    confidence: confidenceFromVisibility(visibility),
    explanation:
      flexion >= 15
        ? 'the knee stayed softly bent through stance.'
        : flexion >= 8
          ? 'the knee was fairly straight through stance.'
          : 'the knee was nearly locked through stance.',
    bands: '15°+ good, 8–15° review, below 8° needs attention',
  };
}

// ---------- per-movement metric sets ----------

// Each entry is a measurement the engine TRIED to take; null means it could
// not be taken honestly from this footage and was left out.
type Attempt = MetricSpec | null;

function squatSpecs(front: PoseSequence, side: PoseSequence, geometry: FrontGeometry): Attempt[] {
  const near = nearerSide(side.frames);
  return [
    kneeValgusMetric(front.frames, 'during the squat'),
    depthMetric(side.frames, near, 'Squat Depth'),
    forwardTrunkMetric(side.frames, near, true, 40, 55, 75),
    lateralTrunkMetric(front.frames, geometry),
    pelvicTiltMetric(front.frames, geometry, 'Pelvic Control'),
  ];
}

function jumpOrLandingSpecs(front: PoseSequence, side: PoseSequence, geometry: FrontGeometry): Attempt[] {
  const near = nearerSide(side.frames);
  return [
    kneeValgusMetric(front.frames, 'around landing'),
    ...landingMetrics(side, near),
    lateralTrunkMetric(front.frames, geometry),
    pelvicTiltMetric(front.frames, geometry, 'Pelvic Control'),
  ];
}

function gaitSpecs(
  type: 'running' | 'walking',
  front: PoseSequence,
  side: PoseSequence,
  geometry: FrontGeometry,
): Attempt[] {
  const near = nearerSide(side.frames);
  const [idealMin, idealMax] = type === 'running' ? [165, 185] : [100, 125];
  return [
    cadenceMetric(side, idealMin, idealMax),
    stanceValgusMetric(front, 'left'),
    stanceValgusMetric(front, 'right'),
    pelvicTiltMetric(front.frames, geometry, 'Pelvic Drop'),
    forwardTrunkMetric(side.frames, near, false, 12, 20, 35),
    stanceKneeMetric(side, near),
  ];
}

function customSpecs(front: PoseSequence, side: PoseSequence, geometry: FrontGeometry): Attempt[] {
  const near = nearerSide(side.frames);
  return [
    kneeValgusMetric(front.frames, 'while loading'),
    lateralTrunkMetric(front.frames, geometry),
    pelvicTiltMetric(front.frames, geometry, 'Pelvic Control'),
    forwardTrunkMetric(side.frames, near, true, 40, 55, 75),
    depthMetric(side.frames, near, 'Knee Bend Range'),
  ];
}

function specsFor(
  type: MovementType,
  front: PoseSequence,
  side: PoseSequence,
  geometry: FrontGeometry,
): Attempt[] {
  switch (type) {
    case 'squat':
      return squatSpecs(front, side, geometry);
    case 'jump':
    case 'landing':
      return jumpOrLandingSpecs(front, side, geometry);
    case 'running':
    case 'walking':
      return gaitSpecs(type, front, side, geometry);
    default:
      return customSpecs(front, side, geometry);
  }
}

// ---------- narrative ----------

const MOVEMENT_NAMES: Record<MovementType, string> = {
  squat: 'squat',
  jump: 'jump',
  landing: 'landing',
  running: 'running form',
  walking: 'walking pattern',
  custom: 'movement',
};

// Which general practice focus each metric family points to. Educational,
// never prescriptive.
function focusFor(key: string): string {
  if (key.includes('valgus')) return 'keeping the knees tracking over the middle of the feet during slow, controlled repetitions';
  if (key.includes('depth') || key.includes('range')) return 'building a controlled range of motion gradually';
  if (key.includes('contact') || key.includes('absorption')) return 'landing softly with more knee bend and letting the hips share the load';
  if (key.includes('trunk')) return 'keeping the trunk steady and upright while the legs do the work';
  if (key.includes('pelvic')) return 'single-leg balance work with a level pelvis';
  if (key.includes('cadence')) return 'slightly shorter, quicker steps';
  if (key.includes('stance')) return 'a softer knee through each step';
  return 'slow, controlled repetitions';
}

function notesMentionDiscomfort(notes: string | undefined): boolean {
  if (!notes) return false;
  return /pain|hurt|injur|dizz|numb/i.test(notes);
}

function bandWord(status: MovementMetric['status']): string {
  return status === 'good' ? 'good' : status === 'attention' ? 'review' : 'needs-attention';
}

// ---------- validation ----------

function assertUsable(sequence: PoseSequence, which: 'front' | 'side'): void {
  const detected = sequence.sampledFrames ? sequence.frames.length / sequence.sampledFrames : 0;
  if (sequence.frames.length === 0) {
    throw new AnalysisError(which === 'front' ? 'no-person-front' : 'no-person-side');
  }
  if (sequence.frames.length < MIN_FRAMES || detected < MIN_DETECTED_FRACTION) {
    throw new AnalysisError(which === 'front' ? 'too-little-front' : 'too-little-side');
  }
}

// ---------- engine ----------

export function generateMovementAnalysis(input: MovementAnalysisInput): MovementReport {
  const { front, side } = input;
  assertUsable(front.sequence, 'front');
  assertUsable(side.sequence, 'side');

  // Refuse a clip the classifier is even moderately sure is the wrong view
  // (the slots are easy to swap); a merely oblique clip lowers confidence
  // rather than blocking the analysis.
  const frontView = classifyView(front.sequence);
  const sideView = classifyView(side.sequence);
  if (frontView.view === 'side' && frontView.confidence > 0.35) {
    throw new AnalysisError('front-looks-like-side');
  }
  if (sideView.view === 'front' && sideView.confidence > 0.35) {
    throw new AnalysisError('side-looks-like-front');
  }

  const geometry: FrontGeometry = { yaw: estimateFrontYaw(front.sequence.frames) };
  const frontOblique = geometry.yaw !== null && geometry.yaw >= YAW_UNRELIABLE;
  const frontSlightlyOff = geometry.yaw !== null && !frontOblique && geometry.yaw >= YAW_CAUTION;

  const attempts = specsFor(input.movementType, front.sequence, side.sequence, geometry);
  const specs = attempts.filter((spec): spec is MetricSpec => spec !== null);
  const metrics = specs.map((spec) => buildMetric(input.movementType, spec));
  if (metrics.length === 0) {
    throw new AnalysisError('too-little-front');
  }
  const omitted = attempts.length - specs.length;

  const overallScore = Math.round(
    metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length,
  );

  const sorted = [...metrics].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const movementName =
    input.movementType === 'custom' && input.customMovementName?.trim()
      ? input.customMovementName.trim()
      : MOVEMENT_NAMES[input.movementType];

  const frontDetected = Math.round((front.sequence.frames.length / front.sequence.sampledFrames) * 100);
  const sideDetected = Math.round((side.sequence.frames.length / side.sequence.sampledFrames) * 100);
  const lowConfidence = metrics.filter((m) => m.confidence === 'low');
  const anglesOff = frontView.confidence < 0.4 || sideView.confidence < 0.4;

  // --- observations ---
  const observations: string[] = [];
  observations.push(
    `Measured from ${front.sequence.frames.length} front-view and ${side.sequence.frames.length} side-view frames ` +
      `(a person was detected in ${frontDetected}% and ${sideDetected}% of sampled frames).`,
  );
  observations.push(`${best.label} was the strongest measurement (${best.score}/100).`);
  if (worst.id !== best.id) {
    observations.push(
      `${worst.label} scored lowest (${worst.score}/100)${worst.status === 'warning' ? ' and is the clearest area to review' : ''}.`,
    );
  }
  if (frontOblique) {
    observations.push(
      `The front video appears to be filmed from roughly ${Math.round(geometry.yaw!)}° off-centre rather than squarely from the front. ` +
        'Sideways trunk and pelvis measurements were left out because camera angle would fake them, and knee valgus was measured from both knees together.',
    );
  } else if (frontSlightlyOff) {
    observations.push(
      `The front video appears slightly off-centre (about ${Math.round(geometry.yaw!)}°), which lowers confidence in the sideways trunk and pelvis measurements.`,
    );
  }
  if (anglesOff) {
    observations.push(
      'One of the videos appears to be filmed at an angle rather than squarely from the front or side, which reduces measurement accuracy.',
    );
  }
  if (lowConfidence.length > 0) {
    observations.push(
      `${lowConfidence.length === 1 ? 'One measurement was' : `${lowConfidence.length} measurements were`} low-confidence because the joints involved were partly hidden or the camera angle was off.`,
    );
  }
  if (omitted > 0) {
    observations.push(
      `${omitted} measurement${omitted === 1 ? '' : 's'} could not be taken honestly from this footage and ${omitted === 1 ? 'was' : 'were'} left out rather than estimated.`,
    );
  }

  // --- recommendations ---
  const recommendations: string[] = [];
  const keyOf = (metric: MovementMetric) => metric.id.replace(`${input.movementType}-`, '');
  recommendations.push(
    `Priority 1 — ${worst.label.toLowerCase()}: practice ${focusFor(keyOf(worst))}.`,
  );
  const second = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  if (second && second.status !== 'good') {
    recommendations.push(
      `Priority 2 — ${second.label.toLowerCase()}: practice ${focusFor(keyOf(second))}.`,
    );
  } else {
    recommendations.push('Priority 2 — keep building: repeat the movement and compare reports over time.');
  }
  if (frontOblique || frontSlightlyOff || lowConfidence.length > 0 || omitted > 0 || anglesOff) {
    recommendations.push(
      'Film again with the camera squarely facing you (front) and at 90° to that (side), at hip height, whole body in frame including the feet, in good light, for a more complete and accurate review.',
    );
  }
  if (notesMentionDiscomfort(input.notes)) {
    recommendations.push(
      'Your notes mention possible discomfort — consider guidance from a qualified professional before repeating this movement.',
    );
  } else {
    recommendations.push('Stop if the movement causes pain.');
  }

  // --- summary ---
  const summary =
    (worst.status === 'good'
      ? `This automated ${movementName} screening found every measured metric in the good range, with ${best.label.toLowerCase()} the strongest result. `
      : `This automated ${movementName} screening measured ${worst.label.toLowerCase()} at ${worst.value}${worst.unit}, which falls in the ${bandWord(worst.status)} band; ${best.label.toLowerCase()} was the strongest result. `) +
    'Measurements come from pose detection on your front and side videos and are educational screening, not a medical assessment.';

  return {
    id: createReportId(),
    userId: input.userId,
    createdAt: new Date().toISOString(),
    movementType: input.movementType,
    customMovementName:
      input.movementType === 'custom' ? input.customMovementName?.trim() : undefined,
    fileName: front.fileName,
    fileType: front.fileType,
    fileSize: front.fileSize,
    sideFileName: side.fileName,
    sideFileType: side.fileType,
    sideFileSize: side.fileSize,
    engine: 'pose',
    status: 'completed',
    overallScore: Math.min(100, Math.max(0, overallScore)),
    summary,
    metrics,
    observations,
    recommendations,
    // Preserved verbatim so the report can show the user's own words.
    notes: input.notes?.trim() || undefined,
  };
}
