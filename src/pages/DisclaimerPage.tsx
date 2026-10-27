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
          <h2>Automated Screening, Not Assessment</h2>
          <p>
            MoveSafe AI measures joint positions in your front and side videos
            using pose detection that runs in your browser, then calculates
            angles such as knee valgus, knee bend, trunk lean, and pelvic tilt.
            These are two-dimensional estimates from an ordinary camera: they
            cannot measure depth, force, foot-arch shape, or anything in
            millimetres, and lighting, clothing, camera angle, and distance all
            affect accuracy. Each metric shows a confidence level for this
            reason. Reports are learning material, not assessments of your
            body.
          </p>
          <p>
            Reports created before automated screening was introduced are
            labeled &quot;Simulated Educational Analysis&quot; and contain
            demonstration values rather than measurements.
          </p>
        </div>

        <div className="legal-section">
          <h2>Not Medical Advice</h2>
          <p>
            Nothing in this application diagnoses injuries, measures health,
            confirms recovery, or clears anyone for physical activity. Score
            changes between reports are educational comparisons of screening
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
            Optional AI feedback rephrases your report summary in an
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
