import type {
  MetricStatus,
  MovementMetric,
  MovementReport,
  MovementType,
} from '../types/report';
import { createReportId } from './reportStorage';

/*
 * Simulated educational movement analysis.
 *
 * This generator produces demo feedback with local TypeScript logic only —
 * no AI, pose detection, or external service is involved. Results are
 * clearly labeled as simulated in the UI and must never be presented as a
 * diagnosis. Real movement processing may replace this file later.
 *
 * Report content follows the movement-screening sample format: each metric
 * is a measurement with simulated values and units, a screening grade
 * (Good / Caution / Poor — mapped onto the app's good/attention/warning
 * statuses), a confidence level, and left-right comparison where the
 * movement loads one side at a time. Every numeric value is FABRICATED
 * deterministically from the seed — none of it is measured from the file.
 */

export interface MovementAnalysisInput {
  movementType: MovementType;
  customMovementName?: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  notes?: string;
  userId: string | null;
}

// ---------- deterministic pseudo-randomness ----------

// Simple string hash so the same inputs produce similar results.
function hashSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

// Small seeded generator (mulberry32) — varied but repeatable demo scores.
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// ---------- screening-grade framework ----------

type Side = 'left' | 'right';
type Grade = 'good' | 'caution' | 'poor';
type PatternStrength = 'mild' | 'moderate' | 'pronounced';

// Sample-format grade words map onto the app's existing metric statuses,
// so status chips, score bands, comparison, and the dashboard keep working.
const GRADE_STATUS: Record<Grade, MetricStatus> = {
  good: 'good',
  caution: 'attention',
  poor: 'warning',
};

const GRADE_WORD: Record<Grade, string> = {
  good: 'Good',
  caution: 'Caution',
  poor: 'Poor',
};

// Draws a value inside [min, max] with the given number of decimals.
type Draw = (min: number, max: number, decimals?: number) => number;

function makeDraw(random: () => number): Draw {
  return (min, max, decimals = 1) => {
    const factor = 10 ** decimals;
    return Math.round((min + random() * (max - min)) * factor) / factor;
  };
}

// A metric's 0–100 score is derived FROM its grade, so the value in the
// text, the grade word, the status chip, and the score band always agree
// (good ≥ 80, attention 65–79, warning < 65).
function scoreForGrade(grade: Grade, random: () => number): number {
  if (grade === 'good') return clampScore(Math.round(80 + random() * 15));
  if (grade === 'caution') return clampScore(Math.round(65 + random() * 14));
  return clampScore(Math.round(50 + random() * 14));
}

// Grade pickers: the weaker side degrades with the report's overall pattern
// strength; the stronger side stays mostly Good; unsided measurements sit
// in between. All draws come from the seeded generator.
function weakSideGrade(strength: PatternStrength, random: () => number): Grade {
  const r = random();
  if (strength === 'pronounced') return r < 0.7 ? 'poor' : 'caution';
  if (strength === 'moderate') {
    if (r < 0.45) return 'caution';
    if (r < 0.75) return 'poor';
    return 'good';
  }
  return r < 0.5 ? 'caution' : 'good';
}

function strongSideGrade(random: () => number): Grade {
  return random() < 0.78 ? 'good' : 'caution';
}

function unsidedGrade(strength: PatternStrength, random: () => number): Grade {
  const r = random();
  if (strength === 'pronounced') {
    if (r < 0.45) return 'caution';
    if (r < 0.7) return 'poor';
    return 'good';
  }
  if (strength === 'moderate') return r < 0.55 ? 'good' : 'caution';
  return r < 0.75 ? 'good' : 'caution';
}

function confidenceWord(random: () => number): string {
  return random() < 0.45 ? 'medium' : 'high';
}

function capitalize(side: Side): string {
  return side === 'left' ? 'Left' : 'Right';
}

function metricIdFromLabel(movementType: MovementType, label: string): string {
  return `${movementType}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

// ---------- measurement builders ----------

interface MeasurementContext {
  draw: Draw;
  random: () => number;
  weakSide: Side;
  strongSide: Side;
  strength: PatternStrength;
}

function buildMetric(
  movementType: MovementType,
  label: string,
  grade: Grade,
  description: string,
  random: () => number,
): MovementMetric {
  return {
    id: metricIdFromLabel(movementType, label),
    label,
    score: scoreForGrade(grade, random),
    status: GRADE_STATUS[grade],
    description,
  };
}

// Suffix shared by every measurement description.
function gradeTail(grade: Grade, confidence: string): string {
  return `Simulated grade: ${GRADE_WORD[grade]} · confidence ${confidence}.`;
}

// Knee valgus, one side. Uses the sample's screening bands:
// below 8° Good, 8° to below 10° Caution, 10° or more Poor.
function kneeValgusMetric(
  movementType: MovementType,
  side: Side,
  context: MeasurementContext,
  phase: string,
): MovementMetric {
  const grade =
    side === context.weakSide
      ? weakSideGrade(context.strength, context.random)
      : strongSideGrade(context.random);
  const peak =
    grade === 'good'
      ? context.draw(2.5, 7.4)
      : grade === 'caution'
        ? context.draw(8, 9.9)
        : context.draw(10.2, 15.5);
  const start = context.draw(1.5, 3.5);
  const change = Math.round((peak - start) * 10) / 10;
  const movementText =
    grade === 'good'
      ? 'the knee stayed close to the center of the foot'
      : grade === 'caution'
        ? 'the knee drifted toward the inside edge of the foot'
        : 'the knee crossed inside the medial edge of the foot';
  return buildMetric(
    movementType,
    `${capitalize(side)} Knee Valgus`,
    grade,
    `Simulated peak valgus ${peak}° (dynamic change ${change}°) during ${phase} — ${movementText}. ` +
      `Screening bands: below 8° Good, 8–10° Caution, 10°+ Poor. ${gradeTail(grade, confidenceWord(context.random))}`,
    context.random,
  );
}

// Foot and medial-arch control, one side (arch-height % + ankle shift mm).
function footArchMetric(
  movementType: MovementType,
  side: Side,
  context: MeasurementContext,
): MovementMetric {
  const grade =
    side === context.weakSide
      ? weakSideGrade(context.strength, context.random)
      : strongSideGrade(context.random);
  const archDrop =
    grade === 'good'
      ? context.draw(5, 9, 0)
      : grade === 'caution'
        ? context.draw(10, 14, 0)
        : context.draw(15, 22, 0);
  const ankleShift =
    grade === 'good'
      ? context.draw(4, 7, 0)
      : grade === 'caution'
        ? context.draw(8, 13, 0)
        : context.draw(14, 20, 0);
  const behaviour =
    grade === 'good'
      ? 'the arch lowered slightly under load while keeping its general structure'
      : grade === 'caution'
        ? 'the arch lowered noticeably under load and recovered slowly'
        : 'the arch lowered rapidly during loading while the ankle shifted inward relative to the heel';
  return buildMetric(
    movementType,
    `${capitalize(side)} Foot & Arch Control`,
    grade,
    `Simulated arch-height reduction ${archDrop}% with a medial ankle shift of ${ankleShift} mm — ${behaviour}. ` +
      gradeTail(grade, confidenceWord(context.random)),
    context.random,
  );
}

// Pelvic drop + trunk lean toward the weaker side.
function pelvisTrunkMetric(
  movementType: MovementType,
  context: MeasurementContext,
  phase: string,
): MovementMetric {
  const grade = unsidedGrade(context.strength, context.random);
  const drop =
    grade === 'good'
      ? context.draw(2, 4.9)
      : grade === 'caution'
        ? context.draw(5, 7.9)
        : context.draw(8, 11);
  const lean =
    grade === 'good' ? context.draw(1.5, 4.4) : grade === 'caution' ? context.draw(4.5, 7.4) : context.draw(7.5, 10);
  return buildMetric(
    movementType,
    'Pelvic & Trunk Control',
    grade,
    `Simulated peak pelvic drop ${drop}° and trunk lean ${lean}° toward the ${context.weakSide} side during ${phase}. ` +
      gradeTail(grade, confidenceWord(context.random)),
    context.random,
  );
}

// Heel-recovery path for the weaker side (walking/running). Judged on
// direction, magnitude, return position, and step-to-step consistency —
// outward movement alone is not automatically good.
function heelRecoveryMetric(
  movementType: MovementType,
  context: MeasurementContext,
): MovementMetric {
  const grade = weakSideGrade(context.strength, context.random);
  let text: string;
  if (grade === 'good') {
    const outward = context.draw(5, 8);
    text =
      `Simulated ${context.weakSide} heel moved outward ${outward}° during recovery, returned beneath the body ` +
      'before the next contact, and repeated consistently step to step.';
  } else if (grade === 'caution') {
    const outward = context.draw(9, 12);
    text =
      `Simulated ${context.weakSide} heel swung outward ${outward}° and returned beneath the body only partially, ` +
      'with moderate step-to-step consistency.';
  } else {
    const inward = context.draw(3, 6);
    const outward = context.draw(11, 15);
    text =
      `Simulated ${context.weakSide} heel first crossed ${inward}° inward, then swung outward ${outward}°, and did not ` +
      'consistently return beneath the body — low step-to-step consistency.';
  }
  return buildMetric(
    movementType,
    `Heel-Recovery Path (${capitalize(context.weakSide)})`,
    grade,
    `${text} ${gradeTail(grade, confidenceWord(context.random))}`,
    context.random,
  );
}

// ---------- per-movement measurement sets (6 metrics each) ----------

function squatMetrics(context: MeasurementContext): MovementMetric[] {
  const depthGrade = unsidedGrade(context.strength, context.random);
  const flexLeft =
    depthGrade === 'good' ? context.draw(88, 100, 0) : depthGrade === 'caution' ? context.draw(76, 87, 0) : context.draw(62, 75, 0);
  const flexRight = Math.round(flexLeft + context.draw(-4, 4, 0));
  return [
    kneeValgusMetric('squat', 'left', context, 'the descent'),
    kneeValgusMetric('squat', 'right', context, 'the descent'),
    footArchMetric('squat', 'left', context),
    footArchMetric('squat', 'right', context),
    pelvisTrunkMetric('squat', context, 'the loading phase of the squat'),
    buildMetric(
      'squat',
      'Squat Depth & Symmetry',
      depthGrade,
      `Simulated maximum knee flexion ${flexLeft}° left / ${flexRight}° right with no heel lift — ` +
        `${depthGrade === 'good' ? 'depth was symmetrical and controlled' : depthGrade === 'caution' ? 'depth was moderate with mild side-to-side variation' : 'depth was limited and uneven between sides'}. ` +
        gradeTail(depthGrade, confidenceWord(context.random)),
      context.random,
    ),
  ];
}

function landingMetrics(context: MeasurementContext): MovementMetric[] {
  const absorbGrade = unsidedGrade(context.strength, context.random);
  const contactFlex =
    absorbGrade === 'good' ? context.draw(28, 36) : absorbGrade === 'caution' ? context.draw(25, 27.9) : context.draw(18, 24.9);
  const extraFlex =
    absorbGrade === 'good' ? context.draw(45, 60, 0) : absorbGrade === 'caution' ? context.draw(40, 44.9, 0) : context.draw(30, 39.9, 0);
  const symmetryGrade = unsidedGrade(context.strength, context.random);
  const gap =
    symmetryGrade === 'good' ? context.draw(0.01, 0.04, 2) : symmetryGrade === 'caution' ? context.draw(0.05, 0.09, 2) : context.draw(0.1, 0.16, 2);
  const stabilityGrade = unsidedGrade(context.strength, context.random);
  const stableTime =
    stabilityGrade === 'good' ? context.draw(0.4, 0.8, 2) : stabilityGrade === 'caution' ? context.draw(0.9, 1.3, 2) : context.draw(1.4, 2.2, 2);
  const steps = stabilityGrade === 'good' ? 0 : stabilityGrade === 'caution' ? 1 : 2;
  return [
    kneeValgusMetric('landing', 'left', context, 'the landing'),
    kneeValgusMetric('landing', 'right', context, 'the landing'),
    buildMetric(
      'landing',
      'Landing Absorption',
      absorbGrade,
      `Simulated knee flexion at contact ${contactFlex}° with ${extraFlex}° of additional flexion after contact — ` +
        `${absorbGrade === 'good' ? 'the landing was absorbed softly through a full range' : absorbGrade === 'caution' ? 'the landing was slightly stiff at first contact' : 'the landing was stiff, with limited bending after contact'}. ` +
        gradeTail(absorbGrade, confidenceWord(context.random)),
      context.random,
    ),
    footArchMetric('landing', context.weakSide, context),
    buildMetric(
      'landing',
      'Contact Symmetry',
      symmetryGrade,
      `Simulated ${context.weakSide} foot contacted ${gap} seconds before the ${context.strongSide} — ` +
        `${symmetryGrade === 'good' ? 'an essentially simultaneous landing' : symmetryGrade === 'caution' ? 'a slightly asymmetrical landing' : 'a clearly staggered landing'}. ` +
        gradeTail(symmetryGrade, confidenceWord(context.random)),
      context.random,
    ),
    buildMetric(
      'landing',
      'Stabilization',
      stabilityGrade,
      `Simulated time to a stable position ${stableTime} s with ${steps} corrective ${steps === 1 ? 'step' : 'steps'}. ` +
        gradeTail(stabilityGrade, confidenceWord(context.random)),
      context.random,
    ),
  ];
}

function jumpMetrics(context: MeasurementContext): MovementMetric[] {
  const symmetryGrade = unsidedGrade(context.strength, context.random);
  const loadDiff =
    symmetryGrade === 'good' ? context.draw(1, 4.9, 0) : symmetryGrade === 'caution' ? context.draw(5, 9.9, 0) : context.draw(10, 18, 0);
  const depthGrade = unsidedGrade(context.strength, context.random);
  const cmFlex =
    depthGrade === 'good' ? context.draw(80, 100, 0) : depthGrade === 'caution' ? context.draw(65, 79, 0) : context.draw(50, 64, 0);
  const trunkGrade = unsidedGrade(context.strength, context.random);
  const lean =
    trunkGrade === 'good' ? context.draw(1.5, 3.9) : trunkGrade === 'caution' ? context.draw(4, 6.9) : context.draw(7, 10);
  const absorbGrade = unsidedGrade(context.strength, context.random);
  const extraFlex =
    absorbGrade === 'good' ? context.draw(45, 60, 0) : absorbGrade === 'caution' ? context.draw(40, 44.9, 0) : context.draw(30, 39.9, 0);
  return [
    buildMetric(
      'jump',
      'Takeoff Symmetry',
      symmetryGrade,
      `Simulated left-right loading difference of ${loadDiff}% at takeoff, with the ${context.weakSide} side loading ` +
        `${symmetryGrade === 'good' ? 'almost evenly with' : 'later and lighter than'} the ${context.strongSide}. ` +
        gradeTail(symmetryGrade, confidenceWord(context.random)),
      context.random,
    ),
    kneeValgusMetric('jump', 'left', context, 'the countermovement'),
    kneeValgusMetric('jump', 'right', context, 'the countermovement'),
    buildMetric(
      'jump',
      'Countermovement Depth',
      depthGrade,
      `Simulated knee flexion of ${cmFlex}° in the countermovement — ` +
        `${depthGrade === 'good' ? 'a full, controlled power position' : depthGrade === 'caution' ? 'a moderate power position' : 'a shallow power position that limits force development'}. ` +
        gradeTail(depthGrade, confidenceWord(context.random)),
      context.random,
    ),
    buildMetric(
      'jump',
      'Trunk Control',
      trunkGrade,
      `Simulated peak lateral trunk lean ${lean}° toward the ${context.weakSide} side through takeoff and landing. ` +
        gradeTail(trunkGrade, confidenceWord(context.random)),
      context.random,
    ),
    buildMetric(
      'jump',
      'Landing Absorption',
      absorbGrade,
      `Simulated additional knee flexion of ${extraFlex}° after ground contact — ` +
        `${absorbGrade === 'good' ? 'the landing was absorbed softly' : absorbGrade === 'caution' ? 'the landing was slightly stiff' : 'the landing was stiff, with limited bending after contact'}. ` +
        gradeTail(absorbGrade, confidenceWord(context.random)),
      context.random,
    ),
  ];
}

function runningMetrics(context: MeasurementContext): MovementMetric[] {
  const cadenceGrade = unsidedGrade(context.strength, context.random);
  const cadence =
    cadenceGrade === 'good' ? context.draw(168, 182, 0) : cadenceGrade === 'caution' ? context.draw(158, 167, 0) : context.draw(145, 157, 0);
  const strideGrade = unsidedGrade(context.strength, context.random);
  const overstride =
    strideGrade === 'good' ? context.draw(2, 7.9) : strideGrade === 'caution' ? context.draw(8, 13.9) : context.draw(14, 22);
  const weakKnee = weakSideGrade(context.strength, context.random);
  const weakMove =
    weakKnee === 'good' ? context.draw(2.5, 5.9) : weakKnee === 'caution' ? context.draw(6, 8.9) : context.draw(9, 13.5);
  const strongKnee = strongSideGrade(context.random);
  const strongMove = strongKnee === 'good' ? context.draw(2.5, 5.9) : context.draw(6, 8.9);
  const pelvisGrade = unsidedGrade(context.strength, context.random);
  const weakDrop =
    pelvisGrade === 'good' ? context.draw(2, 4.9) : pelvisGrade === 'caution' ? context.draw(5, 7.4) : context.draw(7.5, 10);
  const strongDrop = context.draw(2.5, 4.5);
  const sideLabel = (side: Side, gradeMove: number, grade: Grade) =>
    buildMetric(
      'running',
      `${capitalize(side)} Knee Control`,
      grade,
      `Simulated medial knee movement of ${gradeMove}° during ${side} stance — ` +
        `${grade === 'good' ? 'the knee stayed close to the center of the foot' : grade === 'caution' ? 'the knee drifted inward under load' : 'the knee moved clearly toward the midline during midstance'}. ` +
        gradeTail(grade, confidenceWord(context.random)),
      context.random,
    );
  return [
    buildMetric(
      'running',
      'Cadence & Rhythm',
      cadenceGrade,
      `Simulated cadence ${cadence} steps per minute with a steady stride rhythm. ` +
        gradeTail(cadenceGrade, confidenceWord(context.random)),
      context.random,
    ),
    buildMetric(
      'running',
      'Overstride Control',
      strideGrade,
      `Simulated foot contact ${overstride} cm ahead of the projected hip position — ` +
        `${strideGrade === 'good' ? 'contact landed close under the body' : strideGrade === 'caution' ? 'a mild overstride' : 'a pronounced overstride that increases braking'}. ` +
        gradeTail(strideGrade, confidenceWord(context.random)),
      context.random,
    ),
    context.weakSide === 'left' ? sideLabel('left', weakMove, weakKnee) : sideLabel('left', strongMove, strongKnee),
    context.weakSide === 'right' ? sideLabel('right', weakMove, weakKnee) : sideLabel('right', strongMove, strongKnee),
    buildMetric(
      'running',
      'Pelvic Stability',
      pelvisGrade,
      `Simulated pelvic drop ${weakDrop}° during ${context.weakSide} stance versus ${strongDrop}° during ${context.strongSide} stance. ` +
        gradeTail(pelvisGrade, confidenceWord(context.random)),
      context.random,
    ),
    heelRecoveryMetric('running', context),
  ];
}

function walkingMetrics(context: MeasurementContext): MovementMetric[] {
  const timingGrade = unsidedGrade(context.strength, context.random);
  const cadence = context.draw(106, 122, 0);
  const timingDiff =
    timingGrade === 'good' ? context.draw(0.5, 2.4) : timingGrade === 'caution' ? context.draw(2.5, 4.9) : context.draw(5, 8);
  const widthGrade = unsidedGrade(context.strength, context.random);
  const width =
    widthGrade === 'good' ? context.draw(6, 10.9) : widthGrade === 'caution' ? context.draw(11, 14.9) : context.draw(15, 20);
  const weakKnee = weakSideGrade(context.strength, context.random);
  const weakMove =
    weakKnee === 'good' ? context.draw(2, 5.4) : weakKnee === 'caution' ? context.draw(5.5, 8.4) : context.draw(8.5, 12);
  const strongKnee = strongSideGrade(context.random);
  const strongMove = strongKnee === 'good' ? context.draw(2, 5.4) : context.draw(5.5, 8.4);
  const kneeMetric = (side: Side, move: number, grade: Grade) =>
    buildMetric(
      'walking',
      `${capitalize(side)} Knee Control`,
      grade,
      `Simulated medial knee movement of ${move}° during ${side} stance while walking. ` +
        gradeTail(grade, confidenceWord(context.random)),
      context.random,
    );
  return [
    buildMetric(
      'walking',
      'Cadence & Step Timing',
      timingGrade,
      `Simulated cadence ${cadence} steps per minute with a left-right timing difference of ${timingDiff}%. ` +
        gradeTail(timingGrade, confidenceWord(context.random)),
      context.random,
    ),
    buildMetric(
      'walking',
      'Step Width',
      widthGrade,
      `Simulated average step width ${width} cm — ` +
        `${widthGrade === 'good' ? 'inside a typical comfortable range' : 'wider than a typical comfortable range, which can signal balance compensation'}. ` +
        gradeTail(widthGrade, confidenceWord(context.random)),
      context.random,
    ),
    kneeMetric('left', context.weakSide === 'left' ? weakMove : strongMove, context.weakSide === 'left' ? weakKnee : strongKnee),
    kneeMetric('right', context.weakSide === 'right' ? weakMove : strongMove, context.weakSide === 'right' ? weakKnee : strongKnee),
    pelvisTrunkMetric('walking', context, 'single-leg stance'),
    heelRecoveryMetric('walking', context),
  ];
}

function customMetrics(context: MeasurementContext): MovementMetric[] {
  const sideMetric = (side: Side) => {
    const grade =
      side === context.weakSide
        ? weakSideGrade(context.strength, context.random)
        : strongSideGrade(context.random);
    const drift =
      grade === 'good' ? context.draw(2, 5.9) : grade === 'caution' ? context.draw(6, 9.4) : context.draw(9.5, 14);
    return buildMetric(
      'custom',
      `${capitalize(side)}-Side Control`,
      grade,
      `Simulated ${side}-side joint alignment drifted ${drift}° from its starting line while that side accepted load. ` +
        gradeTail(grade, confidenceWord(context.random)),
      context.random,
    );
  };
  const balanceGrade = unsidedGrade(context.strength, context.random);
  const stableTime =
    balanceGrade === 'good' ? context.draw(0.4, 0.8, 2) : balanceGrade === 'caution' ? context.draw(0.9, 1.3, 2) : context.draw(1.4, 2.2, 2);
  const corrections = balanceGrade === 'good' ? 0 : balanceGrade === 'caution' ? 1 : 2;
  const trunkGrade = unsidedGrade(context.strength, context.random);
  const lean =
    trunkGrade === 'good' ? context.draw(1.5, 3.9) : trunkGrade === 'caution' ? context.draw(4, 6.9) : context.draw(7, 10);
  const symmetryGrade = unsidedGrade(context.strength, context.random);
  const loadDiff =
    symmetryGrade === 'good' ? context.draw(1, 4.9, 0) : symmetryGrade === 'caution' ? context.draw(5, 9.9, 0) : context.draw(10, 16, 0);
  const consistencyGrade = unsidedGrade(context.strength, context.random);
  const variation =
    consistencyGrade === 'good' ? context.draw(3, 7.9, 0) : consistencyGrade === 'caution' ? context.draw(8, 13.9, 0) : context.draw(14, 22, 0);
  return [
    sideMetric('left'),
    sideMetric('right'),
    buildMetric(
      'custom',
      'Balance & Stabilization',
      balanceGrade,
      `Simulated time to a stable position ${stableTime} s with ${corrections} corrective ${corrections === 1 ? 'adjustment' : 'adjustments'}. ` +
        gradeTail(balanceGrade, confidenceWord(context.random)),
      context.random,
    ),
    buildMetric(
      'custom',
      'Trunk Control',
      trunkGrade,
      `Simulated peak lateral trunk lean ${lean}° toward the ${context.weakSide} side during loading. ` +
        gradeTail(trunkGrade, confidenceWord(context.random)),
      context.random,
    ),
    buildMetric(
      'custom',
      'Movement Symmetry',
      symmetryGrade,
      `Simulated left-right loading difference of ${loadDiff}% across repetitions. ` +
        gradeTail(symmetryGrade, confidenceWord(context.random)),
      context.random,
    ),
    buildMetric(
      'custom',
      'Movement Consistency',
      consistencyGrade,
      `Simulated repetition-to-repetition variation of ${variation}% in the movement path. ` +
        gradeTail(consistencyGrade, confidenceWord(context.random)),
      context.random,
    ),
  ];
}

const METRIC_BUILDERS: Record<MovementType, (context: MeasurementContext) => MovementMetric[]> = {
  squat: squatMetrics,
  jump: jumpMetrics,
  landing: landingMetrics,
  running: runningMetrics,
  walking: walkingMetrics,
  custom: customMetrics,
};

const MOVEMENT_NAMES: Record<MovementType, string> = {
  squat: 'squat',
  jump: 'jump',
  landing: 'landing',
  running: 'running form',
  walking: 'walking pattern',
  custom: 'movement',
};

// Movement-specific "Priority 2" recommendation, sample-format style.
const SECOND_PRIORITY: Record<MovementType, string> = {
  squat: 'Priority 2 — controlled depth: descend slowly and pause at the point where control starts to fade.',
  jump: 'Priority 2 — softer landings: land with more knee bend and let the hips absorb the contact.',
  landing: 'Priority 2 — softer landings: land with more knee bend and let the hips absorb the contact.',
  running: 'Priority 2 — shorter, quicker steps: a slightly higher cadence can reduce overstriding.',
  walking: 'Priority 2 — steady heel path: practice slow, deliberate steps with a consistent heel return.',
  custom: 'Priority 2 — repeat consistency: perform slower repetitions aiming for the same movement path each time.',
};

// The user's optional notes are never treated as medical information; we
// only add a general "seek guidance" recommendation if they mention issues.
function notesMentionDiscomfort(notes: string | undefined): boolean {
  if (!notes) return false;
  return /pain|hurt|injur|dizz|numb/i.test(notes);
}

// ---------- generator ----------

export function generateMovementAnalysis(input: MovementAnalysisInput): MovementReport {
  const createdAt = new Date().toISOString();

  // Seed from file name + movement + timestamp: varied, but not chaotic.
  const random = createSeededRandom(
    hashSeed(`${input.fileName}|${input.movementType}|${createdAt}`),
  );
  const draw = makeDraw(random);

  const movementName =
    input.movementType === 'custom' && input.customMovementName?.trim()
      ? input.customMovementName.trim()
      : MOVEMENT_NAMES[input.movementType];

  // Each simulated recording gets a weaker side and an overall pattern
  // strength; every measurement is drawn consistently from them.
  const weakSide: Side = random() < 0.6 ? 'left' : 'right';
  const strongSide: Side = weakSide === 'left' ? 'right' : 'left';
  const strengthRoll = random();
  const strength: PatternStrength =
    strengthRoll < 0.35 ? 'mild' : strengthRoll < 0.75 ? 'moderate' : 'pronounced';

  const context: MeasurementContext = { draw, random, weakSide, strongSide, strength };
  const metrics = METRIC_BUILDERS[input.movementType](context);

  // Overall score is always the rounded average of the metric scores.
  const overallScore = clampScore(
    Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length),
  );

  const sorted = [...metrics].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // How many weak-side-related measurements graded below Good — drives the
  // cross-measurement pattern language, like the sample's repeated-pattern
  // detection.
  const weakSideBadCount = metrics.filter(
    (metric) =>
      metric.status !== 'good' &&
      metric.label.toLowerCase().includes(weakSide),
  ).length;

  const observations: string[] = [];
  if (weakSideBadCount >= 2) {
    observations.push(
      `Main simulated finding: a repeated ${weakSide}-side pattern — alignment and stabilization reduced across ` +
        `several measurements as the ${weakSide} side accepted load. Because it appeared in more than one measurement, ` +
        'it matters more than an issue seen in a single repetition.',
    );
  } else if (weakSideBadCount === 1) {
    observations.push(
      `A smaller ${weakSide}-side difference appeared in one measurement, while overall control stayed reasonably balanced.`,
    );
  } else {
    observations.push('Both sides showed generally balanced simulated control in this recording.');
  }
  observations.push(`${best.label} was the strongest simulated measurement (${best.score}/100).`);
  if (weakSideBadCount >= 1) {
    observations.push(
      `The ${strongSide} side maintained more stable simulated alignment and stabilization than the ${weakSide} side.`,
    );
  }
  observations.push(
    `${worst.label} received the lowest simulated grade${
      worst.status === 'warning' ? ' and is the clearest area for focused practice' : ''
    }.`,
  );
  observations.push(
    'One secondary measurement could not be reliably estimated from this simulated recording and was graded ' +
      'Unable to Measure; it did not affect the overall score.',
  );

  const recommendations: string[] = [];
  if (weakSideBadCount >= 1) {
    recommendations.push(
      `Priority 1 — ${weakSide}-side control: practice slow single-leg work while keeping the ${weakSide} knee ` +
        'tracking over the middle of the foot.',
    );
  } else {
    recommendations.push(
      'Priority 1 — keep building balanced control: continue slow single-leg practice on both sides.',
    );
  }
  recommendations.push(SECOND_PRIORITY[input.movementType]);
  recommendations.push(
    random() > 0.5
      ? 'Record from the front and side for a clearer review.'
      : 'Use a controlled warm-up before repeating the movement.',
  );
  if (notesMentionDiscomfort(input.notes)) {
    recommendations.push(
      'Your notes mention possible discomfort — consider guidance from a qualified professional before repeating this movement.',
    );
  } else {
    recommendations.push('Stop if the movement causes pain.');
  }

  const summary =
    weakSideBadCount >= 1
      ? `This simulated ${movementName} analysis shows a ${weakSideBadCount >= 2 ? 'repeated' : 'mild'} ${weakSide}-side ` +
        `control pattern: ${weakSide}-side measurements graded lower as that side accepted load, while the ${strongSide} ` +
        `side stayed better controlled. First training priority: ${weakSide}-side control during single-leg loading. ` +
        'This is simulated educational feedback and not a medical assessment.'
      : `This simulated ${movementName} analysis shows generally balanced control, with ` +
        `${best.label.toLowerCase()} as the strongest simulated measurement. Continue building slow, controlled ` +
        'repetitions on both sides. This is simulated educational feedback and not a medical assessment.';

  return {
    id: createReportId(),
    userId: input.userId,
    createdAt,
    movementType: input.movementType,
    customMovementName:
      input.movementType === 'custom' ? input.customMovementName?.trim() : undefined,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    status: 'completed',
    overallScore,
    summary,
    metrics,
    observations,
    recommendations,
    // Preserved verbatim so the report can show the user's own words.
    notes: input.notes?.trim() || undefined,
  };
}
