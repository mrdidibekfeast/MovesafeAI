// Types for MoveSafe AI movement analysis reports.

export type MovementType =
  | 'squat'
  | 'jump'
  | 'landing'
  | 'running'
  | 'walking'
  | 'custom';

export type ReportStatus = 'processing' | 'completed' | 'failed';

export type MetricStatus = 'good' | 'attention' | 'warning';

// One measured aspect of a movement (e.g. knee alignment).
// Scores always stay between 0 and 100.
export interface MovementMetric {
  id: string;
  label: string;
  score: number;
  status: MetricStatus;
  description: string;
  // Present on pose-measured metrics: the measured quantity, its unit, and
  // how clearly the joints involved were seen. Absent on legacy reports.
  value?: number;
  unit?: string;
  confidence?: 'high' | 'medium' | 'low';
}

// A full movement analysis report.
// userId is the authenticated user's ID, or null for guest reports.
// Only basic file metadata is stored — never the uploaded file itself.
export interface MovementReport {
  id: string;
  userId: string | null;
  createdAt: string; // ISO date string
  movementType: MovementType;
  // Display name entered by the user when movementType is "custom".
  customMovementName?: string;
  fileName: string;
  fileType: string;
  fileSize?: number; // bytes (metadata only)
  status: ReportStatus;
  overallScore: number; // 0–100
  summary: string;
  metrics: MovementMetric[];
  observations: string[];
  recommendations: string[];
  // The user's own optional notes from the Analyze form (max 500 chars).
  // Shown in a dedicated report section and included in PDF/print output.
  notes?: string;
  // Which engine produced the report. Reports created before pose detection
  // existed carry no value and are treated as 'simulated'.
  engine?: 'simulated' | 'pose';
  // Side-view video metadata (pose engine only). Metadata only, never content.
  sideFileName?: string;
  sideFileType?: string;
  sideFileSize?: number;
}
