import type { MovementReport } from '../types/report';

// Fictional sample reports for development only.
// These are NOT loaded automatically — call seedSampleReports() from
// src/services/reportStorage.ts manually during development if needed.
export const sampleReports: MovementReport[] = [
  {
    id: 'sample-squat-001',
    userId: null,
    createdAt: '2026-07-20T14:30:00.000Z',
    movementType: 'squat',
    fileName: 'sample-squat.mp4',
    fileType: 'video/mp4',
    fileSize: 8_400_000,
    status: 'completed',
    overallScore: 78,
    summary:
      'A generally controlled squat with good depth. The knees drift slightly inward on the way up, and heel contact is briefly lost at the bottom of the movement.',
    metrics: [
      {
        id: 'squat-knee-alignment',
        label: 'Knee Alignment',
        score: 64,
        status: 'attention',
        description: 'The knees drift inward slightly during the ascent.',
      },
      {
        id: 'squat-depth',
        label: 'Squat Depth',
        score: 88,
        status: 'good',
        description: 'Comfortable depth with hips reaching below parallel.',
      },
      {
        id: 'squat-trunk-position',
        label: 'Trunk Position',
        score: 82,
        status: 'good',
        description: 'The chest stays tall with a mostly neutral spine.',
      },
      {
        id: 'squat-heel-contact',
        label: 'Heel Contact',
        score: 70,
        status: 'attention',
        description: 'The heels lift briefly at the deepest point of the squat.',
      },
    ],
    observations: [
      'Knees drift inward slightly as you stand back up.',
      'Depth and trunk control are consistent across repetitions.',
      'Heels lose full contact at the bottom of the movement.',
    ],
    recommendations: [
      'Practice squats with a light band around the knees to cue outward pressure.',
      'Strengthen the hips and glutes with bridges and side steps.',
      'Work on ankle mobility to help keep the heels grounded.',
    ],
  },
  {
    id: 'sample-landing-002',
    userId: null,
    createdAt: '2026-07-22T09:15:00.000Z',
    movementType: 'landing',
    fileName: 'sample-drop-landing.mov',
    fileType: 'video/quicktime',
    fileSize: 12_100_000,
    status: 'completed',
    overallScore: 62,
    summary:
      'The landing is stable but stiff. Impact is absorbed with relatively straight legs and an upright torso, which sends more force through the knees.',
    metrics: [
      {
        id: 'landing-knee-bend',
        label: 'Knee Bend on Impact',
        score: 48,
        status: 'warning',
        description: 'The knees stay fairly straight when absorbing the landing.',
      },
      {
        id: 'landing-symmetry',
        label: 'Landing Symmetry',
        score: 74,
        status: 'attention',
        description: 'Slightly more weight lands on the left side.',
      },
      {
        id: 'landing-quietness',
        label: 'Landing Control',
        score: 66,
        status: 'attention',
        description: 'The landing is audible, suggesting limited shock absorption.',
      },
    ],
    observations: [
      'Legs remain stiff at the moment of impact.',
      'The torso stays upright instead of hinging slightly forward.',
      'Weight favors the left leg on most landings.',
    ],
    recommendations: [
      'Practice soft landings by sinking the hips back and down.',
      'Think about landing as quietly as possible.',
      'Add single-leg balance work to even out side-to-side control.',
    ],
  },
  {
    id: 'sample-walking-003',
    userId: null,
    createdAt: '2026-07-24T18:45:00.000Z',
    movementType: 'walking',
    fileName: 'sample-walk.mp4',
    fileType: 'video/mp4',
    fileSize: 5_600_000,
    status: 'completed',
    overallScore: 91,
    summary:
      'A smooth, well-balanced walking pattern with even stride timing and a tall posture. Arm swing is slightly limited on the right side.',
    metrics: [
      {
        id: 'walk-stride-symmetry',
        label: 'Stride Symmetry',
        score: 94,
        status: 'good',
        description: 'Left and right stride timing are nearly identical.',
      },
      {
        id: 'walk-posture',
        label: 'Upright Posture',
        score: 92,
        status: 'good',
        description: 'The head and shoulders stay stacked over the hips.',
      },
      {
        id: 'walk-arm-swing',
        label: 'Arm Swing',
        score: 80,
        status: 'attention',
        description: 'The right arm swings through a smaller range than the left.',
      },
    ],
    observations: [
      'Stride length and timing are consistent on both sides.',
      'Posture remains tall throughout the walk.',
      'The right arm swings noticeably less than the left.',
    ],
    recommendations: [
      'Keep up regular walking — the overall pattern is strong.',
      'Gently exaggerate the right arm swing during short practice walks.',
      'Add light shoulder mobility work to support an even arm swing.',
    ],
  },
];
