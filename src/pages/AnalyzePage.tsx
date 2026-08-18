import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { generateMovementAnalysis } from '../services/movementAnalysis';
import { saveReport } from '../services/reportStorage';
import { formatFileSize } from '../utils/format';
import type { MovementType } from '../types/report';
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

const PROCESSING_MESSAGES = [
  'Reviewing file information…',
  'Evaluating movement patterns…',
  'Preparing educational feedback…',
  'Creating your report…',
];

interface FieldErrors {
  movement?: string;
  customName?: string;
  file?: string;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Processing state
  const [phase, setPhase] = useState<'form' | 'processing' | 'complete'>('form');
  const [processingIndex, setProcessingIndex] = useState(0);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const completeHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const isProcessing = phase === 'processing';

  // The preview URL exists only in temporary browser memory. Revoke the old
  // URL whenever it changes and again when the page unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Rotate the processing messages while the simulated analysis runs.
  useEffect(() => {
    if (!isProcessing) return;
    setProcessingIndex(0);
    const timer = setInterval(() => {
      setProcessingIndex((index) => (index + 1) % PROCESSING_MESSAGES.length);
    }, 700);
    return () => clearInterval(timer);
  }, [isProcessing]);

  // Move focus to the completion message so it is announced.
  useEffect(() => {
    if (phase === 'complete') {
      completeHeadingRef.current?.focus();
    }
  }, [phase]);

  const applyFile = (file: File | null) => {
    if (isProcessing) return;
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, file: error }));
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFieldErrors((prev) => ({ ...prev, file: undefined }));
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (isProcessing) return;
    setSelectedFile(null);
    setPreviewUrl(null);
    setFieldErrors((prev) => ({ ...prev, file: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    applyFile(event.dataTransfer.files?.[0] ?? null);
  };

  const resetForm = () => {
    setMovementType('');
    setCustomMovementName('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setNotes('');
    setFieldErrors({});
    setGeneratedReportId(null);
    setAnalysisError(null);
    setPhase('form');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isProcessing) return;

    const nextErrors: FieldErrors = {};
    if (!movementType) {
      nextErrors.movement = 'Please choose a movement type.';
    }
    if (movementType === 'custom' && !customMovementName.trim()) {
      nextErrors.customName = 'Please enter the movement name.';
    }
    if (!selectedFile) {
      nextErrors.file = 'Please choose a video file to analyze.';
    } else {
      const fileError = validateFile(selectedFile);
      if (fileError) nextErrors.file = fileError;
    }

    if (nextErrors.movement || nextErrors.customName || nextErrors.file) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setAnalysisError(null);
    setPhase('processing');

    try {
      // Simulated processing delay — real movement analysis comes later.
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const report = generateMovementAnalysis({
        movementType: movementType as MovementType,
        customMovementName: customMovementName.trim() || undefined,
        fileName: selectedFile!.name,
        fileType: selectedFile!.type,
        fileSize: selectedFile!.size,
        notes: notes.trim() || undefined,
        userId: isAuthenticated && user ? user.id : null,
      });

      const result = saveReport(report);
      if (!result.success) {
        setAnalysisError(
          'Your analysis was created, but the report could not be saved in this browser.',
        );
        setPhase('form');
        return;
      }

      setGeneratedReportId(report.id);
      setPhase('complete');
    } catch {
      setAnalysisError('We could not complete the movement analysis. Please try again.');
      setPhase('form');
    }
  };

  const formReady = Boolean(movementType) && Boolean(selectedFile) && !fieldErrors.file;

  return (
    <section className="page-section analyze-page">
      <div className="layout-container">
        <header className="analyze-header">
          <span className="analyze-sim-badge">Simulated Educational Analysis</span>
          <h1>Analyze Your Movement</h1>
          <p>
            Upload a clear, short video of a movement to receive an educational
            movement-quality report.
          </p>
        </header>

        <ol className="analyze-steps">
          <li className="analyze-step">
            <span className="analyze-step-number" aria-hidden="true">1</span>
            Choose a movement
          </li>
          <li className="analyze-step">
            <span className="analyze-step-number" aria-hidden="true">2</span>
            Upload a file
          </li>
          <li className="analyze-step">
            <span className="analyze-step-number" aria-hidden="true">3</span>
            Review your report
          </li>
        </ol>

        <p className="analyze-account-note">
          {isAuthenticated ? (
            'Your completed report can be saved to your account.'
          ) : (
            <>
              You can complete one educational analysis as a guest.{' '}
              <Link to="/login">Sign in</Link> to save and compare reports.
            </>
          )}
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
            <p className="processing-message">{PROCESSING_MESSAGES[processingIndex]}</p>
            <p className="processing-note">
              Please keep this page open while your educational report is prepared.
            </p>
            <p className="processing-note">
              This is a simulated educational analysis — not a medical evaluation.
            </p>
          </div>
        )}

        {phase === 'complete' && (
          <div className="analysis-complete" role="status" aria-live="polite">
            <span className="complete-icon" aria-hidden="true">✅</span>
            <h2 className="complete-heading" tabIndex={-1} ref={completeHeadingRef}>
              Your movement report is ready.
            </h2>
            <p className="processing-note">
              Simulated educational analysis — not a medical assessment.
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
              <p className="analyze-section-hint">Select the movement shown in your file.</p>

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

            {/* File upload */}
            <div className="analyze-section">
              <h2 className="analyze-section-title">2. Upload a video</h2>
              <p className="analyze-section-hint">
                Supported: MP4, WebM, MOV (up to 50 MB). Video only — image files are
                not supported.
              </p>

              <div
                className={[
                  'upload-zone',
                  isDragging ? 'upload-zone-dragging' : '',
                  fieldErrors.file ? 'upload-zone-error' : '',
                ].join(' ').trim()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <span className="upload-zone-text">Drag and drop a video here</span>
                <span className="upload-zone-subtext">or choose a file</span>
                <label className="form-label" htmlFor="analyze-file">
                  Choose a video
                </label>
                <input
                  id="analyze-file"
                  ref={fileInputRef}
                  type="file"
                  className="upload-input"
                  accept={VIDEO_TYPES.join(',')}
                  onChange={(event) => applyFile(event.target.files?.[0] ?? null)}
                />
              </div>

              {fieldErrors.file && (
                <p className="analyze-field-error" role="alert">
                  {fieldErrors.file}
                </p>
              )}

              <ul className="upload-guidance">
                <li>Capture the full body when possible.</li>
                <li>Use a well-lit environment.</li>
                <li>Keep the camera steady.</li>
                <li>Avoid heavily edited media.</li>
                <li>Use a short video focused on one movement.</li>
              </ul>

              {selectedFile && previewUrl && (
                <div className="file-preview">
                  <video src={previewUrl} className="file-preview-video" controls />
                  <div>
                    <dl className="file-details">
                      <dt>File name</dt>
                      <dd>{selectedFile.name}</dd>
                      <dt>Type</dt>
                      <dd>{selectedFile.type}</dd>
                      <dt>Size</dt>
                      <dd>{formatFileSize(selectedFile.size)}</dd>
                    </dl>
                    <button type="button" className="file-remove-button" onClick={removeFile}>
                      Remove File
                    </button>
                  </div>
                </div>
              )}
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
              MoveSafe AI provides educational movement feedback and does not replace
              evaluation by a qualified healthcare professional.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export default AnalyzePage;
