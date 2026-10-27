// Pose-detection types shared by the detection wrapper, the biomechanics
// math, and the analysis engine.

// One MediaPipe landmark, converted to PIXEL coordinates of the source
// video. Normalized coordinates distort angles on non-square frames, so
// everything downstream works in pixels.
export interface PoseLandmark {
  x: number;
  y: number; // image space: y grows DOWNWARD
  z: number; // relative depth; unreliable from a single camera, unused
  visibility: number; // 0–1 likelihood the joint was actually seen
}

export interface PoseFrame {
  timestampMs: number;
  landmarks: PoseLandmark[]; // always 33 entries, MediaPipe Pose topology
}

export interface PoseSequence {
  frames: PoseFrame[]; // only frames in which a person was detected
  sampledFrames: number; // how many frames were examined in total
  width: number; // source video pixel width
  height: number; // source video pixel height
  durationMs: number; // portion of the video that was analyzed
}

export type CameraView = 'front' | 'side';

// MediaPipe Pose landmark indices. "left"/"right" are the PERSON's sides —
// the model infers handedness, so a person facing the camera still has
// their left knee labeled left even though it appears on image-right.
export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;
