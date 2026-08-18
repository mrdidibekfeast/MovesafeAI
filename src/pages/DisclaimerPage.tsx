import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { FULL_EDUCATIONAL_DISCLAIMER } from '../constants/disclaimers';
import '../styles/legal.css';

function DisclaimerPage() {
  useDocumentTitle('Disclaimer');

  return (
    <section className="page-section">
      <div className="layout-container legal-page">
        <div className="page-header">
          <h1>Disclaimer</h1>
          <p className="page-subtitle legal-intro">
            Please read this before using any MoveSafe AI results.
          </p>
        </div>

        <p className="legal-highlight">{FULL_EDUCATIONAL_DISCLAIMER}</p>

        <div className="legal-section">
          <h2>Simulated Results</h2>
          <p>
            MoveSafe AI is a student demonstration project. Every movement
            report, score, metric, observation, and recommendation is generated
            by a simulated educational process — the application does not
            measure your actual biomechanics, and identical uploads always
            produce the same simulated result. Reports are learning material,
            not assessments of your body.
          </p>
        </div>

        <div className="legal-section">
          <h2>Not Medical Advice</h2>
          <p>
            Nothing in this application diagnoses injuries, measures health,
            confirms recovery, or clears anyone for physical activity. Score
            changes between reports are educational comparisons of simulated
            values, never evidence of physical improvement or decline.
          </p>
          <ul>
            <li>
              Consult a qualified healthcare professional about pain,
              discomfort, injuries, or any health concern.
            </li>
            <li>
              Do not start, stop, or change training, treatment, or
              rehabilitation based on anything shown in this app.
            </li>
            <li>
              Educational content on the Learn page describes general,
              widely-known movement concepts and is not individual guidance.
            </li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>AI-Generated Content</h2>
          <p>
            Optional AI feedback rephrases your simulated report summary in an
            educational tone. It inherits every limitation described above and
            is validated to avoid medical claims, but like all AI-generated
            text it can be imperfect. The locally generated feedback and your
            own judgment always take precedence.
          </p>
        </div>
      </div>
    </section>
  );
}

export default DisclaimerPage;
