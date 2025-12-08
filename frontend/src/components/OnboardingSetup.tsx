import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useIntuitionIdentity } from '../hooks/useIntuitionIdentity';
import { showToast } from './Toast';
import './OnboardingSetup.css';

interface OnboardingSetupProps {
  onComplete: () => void;
}

export function OnboardingSetup({ onComplete }: OnboardingSetupProps) {
  const { address } = useAccount();
  const { createIdentity, isCreating, hasIdentity } = useIntuitionIdentity();
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [description, setDescription] = useState('');

  // Set default username to first 7 characters of wallet address
  useEffect(() => {
    if (address && !username) {
      const defaultUsername = address.slice(0, 7);
      setUsername(defaultUsername);
    }
  }, [address, username]);

  // Check if user already has an identity
  useEffect(() => {
    if (address && hasIdentity()) {
      // User already has an identity, skip onboarding
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.removeItem('isNewUser');
      onComplete();
    }
  }, [address, hasIdentity, onComplete]);

  const handleCreateIdentity = async () => {
    if (!address) {
      showToast('Please connect your wallet', 'warning');
      return;
    }

    if (!username.trim()) {
      showToast('Please enter a username', 'warning');
      return;
    }

    // Create identity on Intuition chain
    const result = await createIdentity({
      name: username,
      description: description || `Profile for ${address.slice(0, 6)}...${address.slice(-4)}`,
      image: profilePicture || undefined,
      url: `https://explorer.intuition.systems/address/${address}`,
    });

    if (result) {
      // Also store locally for backward compatibility
      if (username) {
        localStorage.setItem(`username_${address.toLowerCase()}`, JSON.stringify(username));
      }
      if (profilePicture) {
        localStorage.setItem(`profilePic_${address.toLowerCase()}`, profilePicture);
      }
      
      // Mark onboarding as complete
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.removeItem('isNewUser');
      
      showToast('Identity created successfully!', 'success');
      onComplete();
    }
  };

  const handleSkip = () => {
    // Skip identity creation - just mark onboarding as complete
    localStorage.setItem('onboardingComplete', 'true');
    localStorage.removeItem('isNewUser');
    showToast('You can create your identity later from your profile', 'info');
    onComplete();
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <h1>Create Your Identity</h1>
          <p>Create your identity on the Intuition chain to get started</p>
        </div>

        <div className="onboarding-steps">
          <div className="onboarding-step">
            <h2>Set Up Your Profile</h2>
            <p className="onboarding-description">
              Your profile will be stored on-chain as an Intuition atom, making it decentralized and permanent.
            </p>
            <div className="onboarding-form">
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="onboarding-input"
                  disabled={isCreating}
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="onboarding-input"
                  rows={3}
                  disabled={isCreating}
                />
              </div>
              <div className="form-group">
                <label>Profile Picture URL (Optional)</label>
                <input
                  type="text"
                  value={profilePicture}
                  onChange={(e) => setProfilePicture(e.target.value)}
                  placeholder="https://..."
                  className="onboarding-input"
                  disabled={isCreating}
                />
              </div>
              <div className="onboarding-actions">
                <button 
                  onClick={handleCreateIdentity} 
                  className="onboarding-button-primary"
                  disabled={isCreating || !username.trim()}
                >
                  {isCreating ? (
                    <>
                      <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Creating Identity...
                    </>
                  ) : (
                    'Create Identity on Chain'
                  )}
                </button>
                <button 
                  onClick={handleSkip} 
                  className="onboarding-button-secondary"
                  disabled={isCreating}
                >
                  Skip for now
                </button>
              </div>
              {isCreating && (
                <div className="onboarding-info">
                  <p>Please confirm the transaction in your wallet to create your identity on the Intuition chain.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
