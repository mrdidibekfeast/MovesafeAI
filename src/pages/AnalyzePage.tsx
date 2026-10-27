import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AnalysisError, generateMovementAnalysis } from '../services/movementAnalysis';
import type { AnalysisErrorCode } from '../services/movementAnalysis';
import { PoseDetectionError, extractPoseSequence, loadPoseLandmarker } from '../services/poseDetection';
import { saveReport } from '../services/reportStorage';
import { formatFileSize } from '../utils/format';
import type { MovementType } from '../types/report';
import type { CameraView } from '../types/pose';
import '../styles/analyze.css';

const MOVEMENT_OPTIONS: { value: MovementType; label: string }[] = [
  { value: 'squat', label: 'Squat' },
  { value: 'jump', label: 'Jump' },
  { value: 'landing', label: 'Landing' },
  { value: 'running', label: 'Running' },
  { value: 'walking', label: 'Walking' },
  { value: 'custom', label: 'Other Movement' },
];

// Video only — image uploads are not accepted for movement analysis.
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_NOTES_LENGTH = 500;

const VIEW_GUIDANCE: Record<CameraView, { title: string; hint: string; tips: string[] }> = {
  front: {
    title: 'Front view',
    hint: 'Camera directly in front of you, facing you.',
    tips: ['Whole body in frame, head to feet', 'Camera at roughly hip height', 'Face the camera squarely'],
  },
  side: {
    title: 'Side view',
    hint: 'Camera directly to one side, at 90° to the front view.',
    tips: ['Whole body in frame, head to feet', 'Camera at roughly hip height', 'Same movement as the front video'],
  },
};

type Stage = 'loading-model' | 'front' | 'side' | 'computing' | 'saving';

const STAGE_TEXT: Record<Stage, string> = {
  'loading-model': 'Loading the pose model (first use only)…',
  front: 'Detecting joints in the front video…',
  side: 'Detecting joints in the side video…',
  computing: 'Measuring angles and building your report…',
  saving: 'Saving your report…',
};

const ANALYSIS_MESSAGES: Record<AnalysisErrorCode, string> = {
  'no-person-front': 'No person was detected in the front video. Make sure your whole body is visible and well lit, then try again.',
  'no-person-side': 'No person was detected in the side video. Make sure your whole body is visible and well lit, then try again.',
  'too-little-front': 'The person was only visible in a small part of the front video. Keep the whole body in frame for the full clip.',
  'too-little-side': 'The person was only visible in a small part of the side video. Keep the whole body in frame for the full clip.',
  'front-looks-like-side': 'The "front" video looks like it was filmed from the side. Please check the two videos are in the right slots.',
  'side-looks-like-front': 'The "side" video looks like it was filmed from the front. Please check the two videos are in the right slots.',
};

interface FieldErrors {
  movement?: string;
  customName?: string;
  front?: string;
  side?: string;
}

interface VideoSlot {
  file: File | null;
  previewUrl: string | null;
}

// Returns an error message for an unusable file, or null when it is valid.
function validateFile(file: File): string | null {
  if (!VIDEO_TYPES.includes(file.type)) {
    return 'Please upload an MP4, WebM, or MOV video file. Images are not supported.';
  }
  if (file.size === 0) {
    return 'The selected file appears to be empty. Please choose another file.';
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return 'The selected video is larger than 50 MB.';
  }
  return null;
}

function AnalyzePage() {
  useDocumentTitle('Analyze Movement');
  const { user, isAuthenticated } = useAuth();

  // Form state
  const [movementType, setMovementType] = useState<MovementType | ''>('');
  const [customMovementName, setCustomMovementName] = useState('');
  const [videos, setVideos] = useState<Record<CameraView, VideoSlot>>({
    front: { file: null, previewUrl: null },
    side: { file: null, previewUrl: null },
  });
  const [notes, setNotes] = useState('');
  const [dragging, setDragging] = useState<CameraView | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Processing state
  const [phase, setPhase] = useState<'form' | 'processing' | 'complete'>('form');
  const [stage, setStage] = useState<Stage>('loading-model');
  const [progress, setProgress] = useState(0); // 0–100 across both videos
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const inputRefs = useRef<Record<CameraView, HTMLInputElement | null>>({ front: null, side: null });
  const completeHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isProcessing = phase === 'processing';

  // Preview URLs exist only in temporary browser memory. Revoke them when
  // they change and when the page unmounts — the video is never persisted.
  useEffect(() => {
    return () => {
      if (videos.front.previewUrl) URL.revokeObjectURL(videos.front.previewUrl);
      if (videos.side.previewUrl) URL.revokeObjectURL(videos.side.previewUrl);
    };
  }, [videos.front.previewUrl, videos.side.previewUrl]);

  // Cancel any in-flight analysis if the user leaves the page.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Move focus to the completion message so it is announced.
  useEffect(() => {
    if (phase === 'complete') {
      completeHeadingRef.current?.focus();
    }
  }, [phase]);

  const setSlot = (view: CameraView, slot: VideoSlot) =>
    setVideos((prev) => ({ ...prev, [view]: slot }));

  const applyFile = (view: CameraView, file: File | null) => {
    if (isProcessing || !file) return;
    const error = validateFile(file);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [view]: error }));
      setSlot(view, { file: null, previewUrl: null });
      const input = inputRefs.current[view];
      if (input) input.value = '';
      return;
    }
    setFieldErrors((prev) => ({ ...prev, [view]: undefined }));
    setSlot(view, { file, previewUrl: URL.createObjectURL(file) });
  };

  const removeFile = (view: CameraView) => {
    if (isProcessing) return;
    setSlot(view, { file: null, previewUrl: null });
    setFieldErrors((prev) => ({ ...prev, [view]: undefined }));
    const input = inputRefs.current[view];
    if (input) input.value = '';
  };

  const handleDragOver = (view: CameraView) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isProcessing) setDragging(view);
  };

  const handleDrop = (view: CameraView) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(null);
    applyFile(view, event.dataTransfer.files?.[0] ?? null);
  };

  const resetForm = () => {
    setMovementType('');
    setCustomMovementName('');
    setVideos({ front: { file: null, previewUrl: null }, side: { file: null, previewUrl: null } });
    setNotes('');
    setFieldErrors({});
    setGeneratedReportId(null);
    setAnalysisError(null);
    setProgress(0);
    setPhase('form');
    for (const view of ['front', 'side'] as const) {
      const input = inputRefs.current[view];
      if (input) input.value = '';
    }
  };

  const cancelAnalysis = () => {
    abortRef.current?.abort();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isProcessing) return;

    const nextErrors: FieldErrors = {};
    if (!movementType) nextErrors.movement = 'Please choose a movement type.';
    if (movementType === 'custom' && !customMovementName.trim()) {
      nextErrors.customName = 'Please enter the movement name.';
    }
    for (const view of ['front', 'side'] as const) {
      const file = videos[view].file;
      if (!file) {
        nextErrors[view] = `Please add the ${view}-view video.`;
      } else {
        const fileError = validateFile(file);
        if (fileError) nextErrors[view] = fileError;
      }
    }
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }

    const frontFile = videos.front.file!;
    const sideFile = videos.side.file!;

    setFieldErrors({});
    setAnalysisError(null);
    setProgress(0);
    setStage('loading-model');
    setPhase('processing');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await loadPoseLandmarker();

      // Each video contributes half of the progress bar.
      setStage('front');
      const frontSequence = await extractPoseSequence(frontFile, {
        signal: controller.signal,
        onProgress: (fraction) => setProgress(Math.round(fraction * 50)),
      });

      setStage('side');
      const sideSequence = await extractPoseSequence(sideFile, {
        signal: controller.signal,
        onProgress: (fraction) => setProgress(50 + Math.round(fraction * 50)),
      });

      setStage('computing');
      const report = generateMovementAnalysis({
        movementType: movementType as MovementType,
        customMovementName: customMovementName.trim() || undefined,
        notes: notes.trim() || undefined,
        userId: isAuthenticated && user ? user.id : null,
        front: { fileName: frontFile.name, fileType: frontFile.type, fileSize: frontFile.size, sequence: frontSequence },
        side: { fileName: sideFile.name, fileType: sideFile.type, fileSize: sideFile.size, sequence: sideSequence },
      });

      setStage('saving');
      const result = await saveReport(report);
      if (!result.success) {
        setAnalysisError(
          isAuthenticated
            ? 'Your analysis was created, but the report could not be saved to your account. Please try again.'
            : 'Your analysis was created, but the report could not be saved in this browser.',
        );
        setPhase('form');
        return;
      }

      setGeneratedReportId(report.id);
      setPhase('complete');
    } catch (error) {
      if (error instanceof PoseDetectionError && error.code === 'aborted') {
        setPhase('form'); // user cancelled — not an error
        return;
      }
      if (error instanceof AnalysisError) {
        setAnalysisError(ANALYSIS_MESSAGES[error.code]);
      } else if (error instanceof PoseDetectionError && error.code === 'model-load-failed') {
        setAnalysisError(
          'The pose model could not be loaded. Check your connection and try again — it only needs to download once.',
        );
      } else if (error instanceof PoseDetectionError) {
        setAnalysisError('One of the videos could not be read. Try re-exporting it as MP4 and uploading again.');
      } else {
        setAnalysisError('We could not complete the movement analysis. Please try again.');
      }
      setPhase('form');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const formReady =
    Boolean(movementType) &&
    Boolean(videos.front.file) &&
    Boolean(videos.side.file) &&
    !fieldErrors.front &&
    !fieldErrors.side;

  const renderUploadSlot = (view: CameraView) => {
    const guidance = VIEW_GUIDANCE[view];
    const slot = videos[view];
    const error = fieldErrors[view];
    const inputId = `analyze-file-${view}`;
    return (
      <div className="upload-slot" key={view}>
        <h3 className="upload-view-title">{guidance.title}</h3>
        <p className="analyze-section-hint">{guidance.hint}</p>

        {slot.file && slot.previewUrl ? (
          <div className="file-preview">
            <video src={slot.previewUrl} className="file-preview-video" controls />
            <div>
              <dl className="file-details">
                <dt>File name</dt>
                <dd>{slot.file.name}</dd>
                <dt>Size</dt>
                <dd>{formatFileSize(slot.file.size)}</dd>
              </dl>
              <button type="button" className="file-remove-button" onClick={() => removeFile(view)}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            className={['upload-zone', dragging === view ? 'upload-zone-dragging' : '', error ? 'upload-zone-error' : '']
              .join(' ')
              .trim()}
            onDragOver={handleDragOver(view)}
            onDragLeave={() => setDragging(null)}
            onDrop={handleDrop(view)}
          >
            <span className="upload-zone-text">Drag and drop the {view} video here</span>
            <span className="upload-zone-subtext">or choose a file</span>
            <label className="form-label" htmlFor={inputId}>
              Choose the {view}-view video
            </label>
            <input
              id={inputId}
              ref={(element) => {
                inputRefs.current[view] = element;
              }}
              type="file"
              className="upload-input"
              accept={VIDEO_TYPES.join(',')}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${inputId}-error` : undefined}
              onChange={(event) => applyFile(view, event.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {error && (
          <p id={`${inputId}-error`} className="analyze-field-error" role="alert">
            {error}
          </p>
        )}

        <ul className="upload-guidance">
          {guidance.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <section className="page-section analyze-page">
      <div className="layout-container">
        <header className="analyze-header">
          <span className="analyze-sim-badge">Automated Movement Screening</span>
          <h1>Analyze Your Movement</h1>
          <p>
            Upload a short video from the front and one from the side. Pose detection runs
            on your device, measures joint angles, and builds an educational report.
          </p>
        </header>

        <ol className="analyze-steps">
          <li className="analyze-step">
            <span className="analyze-step-number" aria-hidden="true">1</span>
            Choose a movement
          </li>
          <li className="analyze-step">
            <span className="analyze-step-number" aria-hidden="true">2</span>
            Upload front + side videos
          </li>
          <li className="analyze-step">
            <span className="analyze-step-number" aria-hidden="true">3</span>
            Review your report
          </li>
        </ol>

        <p className="analyze-account-note">
          {isAuthenticated ? (
            'Your completed report is saved to your account.'
          ) : (
            <>
              You can run an analysis as a guest.{' '}
              <Link to="/login">Sign in</Link> to keep your reports across devices.
            </>
          )}{' '}
          Your videos are processed in your browser and never uploaded.
        </p>

        {analysisError && (
          <div className="analysis-error" role="alert">
            {analysisError}
          </div>
        )}

        {phase === 'processing' && (
          <div className="analysis-processing" role="status" aria-live="polite">
            <span className="processing-spinner" aria-hidden="true" />
            <h2 className="processing-heading">Analyzing Your Movement</h2>
            <p className="processing-message">{STAGE_TEXT[stage]}</p>
            <div
              className="processing-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Analysis progress"
            >
              <div className="processing-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="processing-note">
              Everything runs on this device. Please keep the page open — longer videos
              take a little longer.
            </p>
            <button type="button" className="analyze-again-button" onClick={cancelAnalysis}>
              Cancel
            </button>
          </div>
        )}

        {phase === 'complete' && (
          <div className="analysis-complete" role="status" aria-live="polite">
            <span className="complete-icon" aria-hidden="true">✅</span>
            <h2 className="complete-heading" tabIndex={-1} ref={completeHeadingRef}>
              Your movement report is ready.
            </h2>
            <p className="processing-note">
              Automated educational screening — not a medical assessment.
            </p>
            <div className="complete-actions">
              <Link to={`/report/${generatedReportId}`} className="view-report-button">
                View Report
              </Link>
              <button type="button" className="analyze-again-button" onClick={resetForm}>
                Analyze Another Movement
              </button>
            </div>
          </div>
        )}

        {phase === 'form' && (
          <form className="analyze-form" onSubmit={handleSubmit} noValidate>
            {/* Movement selection */}
            <div className="analyze-section">
              <h2 className="analyze-section-title">1. Choose a movement</h2>
              <p className="analyze-section-hint">Select the movement shown in your videos.</p>

              <fieldset className="analyze-fieldset">
                <legend className="sr-only">Movement type</legend>
                <div className="movement-options">
                  {MOVEMENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={
                        movementType === option.value
                          ? 'movement-option movement-option-selected'
                          : 'movement-option'
                      }
                    >
                      <input
                        type="radio"
                        name="movement-type"
                        value={option.value}
                        checked={movementType === option.value}
                        onChange={() => {
                          setMovementType(option.value);
                          setFieldErrors((prev) => ({ ...prev, movement: undefined }));
                        }}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {fieldErrors.movement && (
                <p className="analyze-field-error" role="alert">
                  {fieldErrors.movement}
                </p>
              )}

              {movementType === 'custom' && (
                <div className="custom-movement-field form-group">
                  <label className="form-label" htmlFor="custom-movement">
                    Movement name
                  </label>
                  <input
                    id="custom-movement"
                    type="text"
                    className={fieldErrors.customName ? 'form-input has-error' : 'form-input'}
                    value={customMovementName}
                    onChange={(event) => {
                      setCustomMovementName(event.target.value);
                      setFieldErrors((prev) => ({ ...prev, customName: undefined }));
                    }}
                    placeholder="Example: tennis serve"
                    aria-invalid={Boolean(fieldErrors.customName)}
                    aria-describedby={fieldErrors.customName ? 'custom-movement-error' : undefined}
                  />
                  {fieldErrors.customName && (
                    <span id="custom-movement-error" className="field-error" role="alert">
                      {fieldErrors.customName}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Two-view upload */}
            <div className="analyze-section">
              <h2 className="analyze-section-title">2. Upload two videos of the same movement</h2>
              <p className="analyze-section-hint">
                MP4, WebM, or MOV, up to 50 MB each. The first 12 seconds of each clip are
                analyzed. Both views are required — each one measures what the other can't.
              </p>
              <div className="upload-grid">{(['front', 'side'] as const).map(renderUploadSlot)}</div>
            </div>

            {/* Notes */}
            <div className="analyze-section">
              <h2 className="analyze-section-title">3. Additional notes (optional)</h2>
              <label className="form-label sr-only" htmlFor="analysis-notes">
                Additional notes
              </label>
              <textarea
                id="analysis-notes"
                className="analysis-notes"
                value={notes}
                maxLength={MAX_NOTES_LENGTH}
                onChange={(event) => setNotes(event.target.value.slice(0, MAX_NOTES_LENGTH))}
                placeholder="Describe anything you noticed, such as discomfort, balance difficulty, or which side felt different."
              />
              <span className="character-counter">
                {notes.length}/{MAX_NOTES_LENGTH}
              </span>
            </div>

            <button type="submit" className="analyze-button" disabled={!formReady || isProcessing}>
              Analyze Movement
            </button>

            <p className="analyze-disclaimer">
              MoveSafe AI provides educational movement screening and does not replace
              evaluation by a qualified healthcare professional.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export default AnalyzePage;
