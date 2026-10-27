// Checks the pure geometry on hand-built poses.
// Run: node --experimental-strip-types scripts/test-pose-math.mjs
import assert from 'node:assert/strict';
const m = await import('../src/services/poseMath.ts');
const P = (x, y) => ({ x, y, visibility: 1 });

// Straight leg: no flexion
assert.ok(Math.abs(m.kneeFlexion(P(0, 0), P(0, 10), P(0, 20))) < 1e-9);
// Right angle at the knee: 90 degrees of flexion
assert.ok(Math.abs(m.kneeFlexion(P(0, 0), P(0, 10), P(10, 10)) - 90) < 1e-9);
// Left leg at x=40, midline at x=50. Knee pushed toward midline = positive (caving in)
const inward = m.frontalKneeAngle(P(40, 0), P(44, 10), P(40, 20), 50);
assert.ok(inward > 0, 'knee toward midline reads as inward');
const outward = m.frontalKneeAngle(P(40, 0), P(36, 10), P(40, 20), 50);
assert.ok(outward < 0, 'knee away from midline reads as outward');
// Bands: lower is better for knee-in
assert.equal(m.gradeFor(5, m.BANDS.frontalKnee), 'good');
assert.equal(m.gradeFor(12, m.BANDS.frontalKnee), 'caution');
assert.equal(m.gradeFor(20, m.BANDS.frontalKnee), 'poor');
// Scores agree w grades: good >= 80, caution 65..79, poor < 65
assert.ok(m.scoreFor(5, m.BANDS.frontalKnee) >= 80);
const c = m.scoreFor(12, m.BANDS.frontalKnee); assert.ok(c >= 65 && c <= 79);
assert.ok(m.scoreFor(20, m.BANDS.frontalKnee) < 65);
assert.ok(m.scoreFor(95, m.BANDS.squatFlexion) >= 80);
// View: wide hips -> front, overlapping hips -> side
assert.equal(m.detectView(P(40, 50), P(60, 50), P(38, 0), P(62, 0)), 'front');
assert.equal(m.detectView(P(50, 50), P(52, 50), P(50, 0), P(52, 0)), 'side');
assert.equal(m.isMeasuredReport({ metrics: [{ id: 'pose-tracking' }] }), true);
assert.equal(m.isMeasuredReport({ metrics: [{ id: 'squat-knee' }] }), false);
console.log('pose math: all checks passed');
