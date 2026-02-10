// components/ConsentModal.jsx
import "../assets/css/consent-modal.css";

export default function ConsentModal({ open, onAccept, onDecline }) {
  if (!open) return null;

  return (
    <div className="consent-backdrop">
      <div
        className="consent-modal consent-modal-large"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
      >
        <h3 id="consent-title" className="header-title">
          Notice / Disclaimer on Use of the Student Financial Obligation
          Verification Platform
        </h3>

        <div className="consent-content">
          <p>
         This platform is provided solely to enable schools to verify whether a prospective student has any
         outstanding financial obligations or indebtedness to a previous school as part of the admission process.
         <br />
         By signing onto and using this platform, the school acknowledges and agrees to the following
          </p>

          <p><strong>Responsibility for Data Entry</strong></p>
          <p>
          The school is solely responsible for the accuracy, completeness, and validity of all information entered, submitted, 
          or updated on the platform. The platform provider shall not be liable for any errors, omissions, or 
          inaccuracies resulting from data supplied by the school.
          </p>

          <p><strong>Restricted and Intended Use</strong></p>
          <p>
          Access to and use of this platform is strictly limited to its intended purpose—verification of a student’s
           outstanding financial obligations to a previous school for admission-related decisions.
            Any use beyond this scope, including unauthorised disclosure, profiling, or commercial use, is strictly prohibited.
          </p>

          <p><strong>Data Protection and Consent</strong></p>
          <p>
          The school confirms that all information submitted has been obtained lawfully and with the necessary consent of the student,
           parent, or guardian, in compliance with applicable data protection and privacy laws.
          </p>

          <p><strong>No Admission Determination Guarantee</strong></p>
          <p>
          The platform functions solely as an information-sharing and verification tool. All admission decisions,
           actions, or consequences arising from information obtained through the platform remain the sole responsibility of the school.
          </p>

          <p><strong>Misuse and Termination of Access</strong></p>
          <p>
          Any misuse of the platform, breach of this notice, or violation of applicable laws may result in immediate suspension or
           termination of access, without prejudice to any available legal remedies.
       
       <br />
       By accessing or using this platform, the school confirms its understanding and acceptance of the above terms.

          </p>

          <p className="consent-final">
            By accessing or using this platform, the school confirms its
            understanding and acceptance of the above terms.
          </p>
        </div>

        <div className="consent-actions">
          {/*
          <button
            type="button"
            className="btn-decline"
            onClick={onDecline}
          >
            Reject
          </button>
          */}

          <button
            type="button"
            className="btn-accept"
            onClick={onAccept}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
