import { useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { showToast } from './Toast';
import './SubscriptionModal.css';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (tier: 'free' | 'pro') => void;
}

export function SubscriptionModal({ isOpen, onClose, onProceed }: SubscriptionModalProps) {
  const { upgradeToPro } = useSubscription();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectFree = () => {
    onProceed('free');
    showToast('Continuing with Free plan', 'success');
  };

  const handleSelectPro = () => {
    upgradeToPro();
    onProceed('pro');
    showToast('Upgraded to Pro plan!', 'success');
  };

  return (
    <div className="subscription-modal-overlay" onClick={onClose}>
      <div className="subscription-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="subscription-modal-close" 
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ width: '100%', height: '100%' }}
          >
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="subscription-modal-header">
          <h2 className="subscription-modal-title">Choose Your Plan</h2>
          <p className="subscription-modal-subtitle">Select a plan to continue creating your space</p>
        </div>

        <div className="subscription-modal-plans">
          {/* Free Plan */}
          <div className="subscription-plan-card">
            <div className="subscription-plan-header">
              <h3 className="subscription-plan-name">Free</h3>
              <div className="subscription-plan-price">$0<span>/month</span></div>
            </div>
            <ul className="subscription-plan-features">
              <li>✓ Create up to 1 active quest</li>
              <li>✓ Max 50 participants per quest</li>
              <li>✓ Basic quest types only</li>
              <li>✓ Simple tasks (1 action)</li>
              <li>✓ Basic analytics</li>
              <li>✓ Default templates</li>
              <li>✓ Manual reward distribution</li>
            </ul>
            <button className="subscription-plan-button" onClick={handleSelectFree}>
              Continue with Free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="subscription-plan-card pro">
            <div className="subscription-plan-badge">Recommended</div>
            <div className="subscription-plan-header">
              <h3 className="subscription-plan-name">Pro</h3>
              <div className="subscription-plan-price">200 TRUST<span>/month</span></div>
            </div>
            <ul className="subscription-plan-features">
              <li>✓ Unlimited active quests</li>
              <li>✓ Unlimited participants</li>
              <li>✓ All quest types</li>
              <li>✓ Multi-step quests</li>
              <li>✓ Advanced verification</li>
              <li>✓ Advanced analytics & insights</li>
              <li>✓ Custom templates</li>
              <li>✓ Automated rewards</li>
              <li>✓ Priority support</li>
            </ul>
            <button className="subscription-plan-button pro" onClick={handleSelectPro}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

