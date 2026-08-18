import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { FULL_EDUCATIONAL_DISCLAIMER } from '../constants/disclaimers';
import '../styles/legal.css';

function PrivacyPage() {
  useDocumentTitle('Privacy');

  return (
    <section className="page-section">
      <div className="layout-container legal-page">
        <div className="page-header">
          <h1>Privacy</h1>
          <p className="page-subtitle legal-intro">
            How MoveSafe AI, a student demonstration project, handles the
            information you provide.
          </p>
        </div>

        <div className="legal-section">
          <h2>Account Information</h2>
          <p>
            Creating an account uses Supabase authentication. The application
            stores your email address and the optional display name you enter at
            signup. Passwords are handled entirely by Supabase — MoveSafe AI
            never stores or displays your password, and it is never saved in
            this browser by the application.
          </p>
        </div>

        <div className="legal-section">
          <h2>Movement Reports</h2>
          <p>
            Movement reports are simulated for education and are stored only in
            this browser&apos;s local storage — they are not uploaded to a
            server in the current design. Deleting a report removes it from
            this browser, and clearing your browser data removes all reports.
          </p>
          <ul>
            <li>
              Uploaded photos and videos are never stored or sent anywhere. The
              app keeps only basic details such as the file name, type, and
              size inside your local report.
            </li>
            <li>
              File previews shown during analysis exist only temporarily in
              your browser&apos;s memory.
            </li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>Optional AI Feedback</h2>
          <p>
            The Dashboard&apos;s AI explanation runs only when you request it.
            A limited summary of simulated scores and metric names is sent
            through a Supabase Edge Function to Google&apos;s Gemini service.
            The summary never includes your name, email, account details,
            report IDs, uploaded files, or file names.
          </p>
        </div>

        <div className="legal-section">
          <h2>Your Choices</h2>
          <ul>
            <li>Use the Analyze page as a guest without creating an account.</li>
            <li>Delete individual reports at any time from My Reports.</li>
            <li>Skip AI feedback entirely — local feedback never leaves your browser.</li>
          </ul>
        </div>

        <p className="legal-highlight">{FULL_EDUCATIONAL_DISCLAIMER}</p>
      </div>
    </section>
  );
}

export default PrivacyPage;
