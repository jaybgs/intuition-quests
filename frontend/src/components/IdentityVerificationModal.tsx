import { useState } from 'react';
import { useIntuitionIdentity } from '../hooks/useIntuitionIdentity';
import { useAccount } from 'wagmi';
import { showToast } from './Toast';
import './IdentityVerificationModal.css';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateIdentity: () => void;
  onVerifyAgain: () => void;
}

export function IdentityVerificationModal({
  isOpen,
  onClose,
  onCreateIdentity,
  onVerifyAgain,
}: IdentityVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="identity-verification-modal-overlay" onClick={onClose}>
      <div className="identity-verification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="identity-verification-modal-header">
          <h2>No Identity Found</h2>
          <button className="identity-verification-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="identity-verification-modal-content">
          <p>We couldn't find an identity on the Intuition chain after multiple attempts.</p>
          <p>Would you like to create a new identity or try verifying again?</p>
        </div>
        <div className="identity-verification-modal-actions">
          <button
            className="identity-verification-modal-button primary"
            onClick={() => {
              onCreateIdentity();
              onClose();
            }}
          >
            Create Identity
          </button>
          <button
            className="identity-verification-modal-button secondary"
            onClick={() => {
              onVerifyAgain();
              onClose();
            }}
          >
            Verify Again
          </button>
        </div>
      </div>
    </div>
  );
}





