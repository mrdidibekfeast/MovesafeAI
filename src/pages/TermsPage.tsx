import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { FULL_EDUCATIONAL_DISCLAIMER } from '../constants/disclaimers';
import '../styles/legal.css';

function TermsPage() {
  useDocumentTitle('Terms of Use');

  return (
    <section className="page-section">
      <div className="layout-container legal-page">
        <div className="page-header">
          <h1>Terms of Use</h1>
          <p className="page-subtitle legal-intro">
            The ground rules for using this educational demonstration.
          </p>
        </div>

        <div className="legal-section">
          <h2>Educational Demonstration</h2>
          <p>
            MoveSafe AI is a student demonstration project provided for
            learning purposes. It is offered as-is, without warranties of any
            kind, and may change or become unavailable at any time. All
            analysis results are simulated — see the{' '}
            <Link to="/disclaimer">Disclaimer</Link> for details.
          </p>
        </div>

        <div className="legal-section">
          <h2>Acceptable Use</h2>
          <ul>
            <li>Use the application for personal, educational exploration.</li>
            <li>Only upload files you have the right to use.</li>
            <li>
              Do not rely on any output for medical, safety, training, or
              return-to-activity decisions.
            </li>
            <li>Do not attempt to disrupt the service or access other users&apos; data.</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>Your Data</h2>
          <p>
            Reports live in your own browser&apos;s storage and can be deleted
            by you at any time. How information is handled is described on the{' '}
            <Link to="/privacy">Privacy</Link> page.
          </p>
        </div>

        <p className="legal-highlight">{FULL_EDUCATIONAL_DISCLAIMER}</p>
      </div>
    </section>
  );
}

export default TermsPage;
