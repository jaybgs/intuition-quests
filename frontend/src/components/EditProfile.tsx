import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { apiClient } from '../services/apiClient';

interface ConnectedWallet {
  address: string;
  chainId?: number;
}

// Helper function to get username from localStorage
const getStoredUsername = (address: string | undefined): string | null => {
  if (!address || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const stored = localStorage.getItem(`username_${address.toLowerCase()}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Helper function to save username to localStorage
const saveUsername = (address: string | undefined, username: string): void => {
  if (!address || typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(`username_${address.toLowerCase()}`, JSON.stringify(username));
  } catch (error) {
    console.error('Error saving username:', error);
  }
};

// Helper function to get profile picture from localStorage
const getStoredProfilePic = (address: string | undefined): string | null => {
  if (!address || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const stored = localStorage.getItem(`profilePic_${address.toLowerCase()}`);
    return stored ? stored : null; // Profile pic is stored as data URL string, not JSON
  } catch {
    return null;
  }
};

export function EditProfile({ onBack }: { onBack: () => void }) {
  const { address, connector } = useAccount();
  const { disconnect } = useDisconnect();
  
  const [profilePic, setProfilePic] = useState<string | null>(() => {
    // Load existing profile picture from localStorage when component mounts
    return getStoredProfilePic(address);
  });
  
  // Reload profile picture when address changes
  useEffect(() => {
    const storedPic = getStoredProfilePic(address);
    setProfilePic(storedPic);
  }, [address]);
  
  const [username, setUsername] = useState<string>(() => {
    // Try to get from localStorage first, then fallback to wallet address
    const stored = getStoredUsername(address);
    if (stored) return stored;
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'User';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>(() => {
    // Initialize with current wallet if connected
    if (address) {
      return [{ address }];
    }
    return [];
  });


  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveWallet = (walletAddress: string) => {
    if (connectedWallets.length > 1) {
      setConnectedWallets(connectedWallets.filter(w => w.address !== walletAddress));
      // If removing current wallet, disconnect
      if (walletAddress.toLowerCase() === address?.toLowerCase()) {
        disconnect();
      }
    }
  };

  const handleConnectWallet = () => {
    // This would trigger Privy's wallet connection
    // For now, we'll just show a message that they need to connect via the main connect button
    // In a real implementation, you'd use Privy's linkWallet or similar method
    if (connectedWallets.length < 3) {
      // Trigger wallet connection flow
      window.location.reload(); // Temporary - in real app, use Privy's linkWallet
    }
  };



  const handleSave = async () => {
    if (!address) {
      setSaveMessage('Please connect your wallet to save changes');
      return;
    }

    if (!username.trim()) {
      setSaveMessage('Username cannot be empty');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Update username via backend API (checks for uniqueness)
      await apiClient.updateUsername(address, username.trim());
      
      // Save username to localStorage for backward compatibility
      saveUsername(address, username.trim());

      // Save profile picture if changed
      if (profilePic) {
        try {
          localStorage.setItem(`profilePic_${address.toLowerCase()}`, profilePic);
        } catch (error) {
          console.error('Error saving profile picture:', error);
        }
      }

      setSaveMessage('Changes saved successfully!');
      setTimeout(() => {
        setSaveMessage(null);
        onBack(); // Navigate back to dashboard after saving
      }, 1500);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save changes';
      setSaveMessage(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="edit-profile">
      <div className="edit-profile-header">
        <button onClick={onBack} className="back-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 className="edit-profile-title">Edit Profile</h1>
        <button 
          onClick={handleSave} 
          className="save-button"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('success') ? 'success' : 'error'}`}>
          {saveMessage}
        </div>
      )}

      <div className="edit-profile-content">
        {/* Username Section */}
        <div className="edit-section">
          <h2 className="section-title">Username</h2>
          <div className="username-section">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="username-input"
              placeholder="Enter your username"
            />
            <p className="section-description">
              This is how other users will see you on TrustQuests. Only the first 7 characters will be displayed.
              {username.length > 7 && (
                <span style={{ color: 'var(--accent-orange)', display: 'block', marginTop: '4px' }}>
                  Note: Username will be displayed as "{username.slice(0, 7)}"
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Profile Picture Section */}
        <div className="edit-section">
          <h2 className="section-title">Profile Picture</h2>
          <div className="profile-pic-section">
            <div className="profile-pic-preview">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="profile-pic-image" />
              ) : (
                <div className="profile-pic-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="profile-pic-actions">
              <label htmlFor="profile-pic-upload" className="upload-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Photo
              </label>
              <input
                id="profile-pic-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                style={{ display: 'none' }}
              />
              {profilePic && (
                <button onClick={() => setProfilePic(null)} className="remove-button">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>


        {/* Connected EVM Wallets Section */}
        <div className="edit-section">
          <h2 className="section-title">Connected EVM Wallets</h2>
          <p className="section-description">You can connect up to 3 EVM wallets</p>
          <div className="wallets-list">
            {connectedWallets.map((wallet, index) => (
              <div key={wallet.address} className="wallet-item">
                <div className="wallet-info">
                  <div className="wallet-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <path d="M6 10h12M6 14h8"/>
                    </svg>
                  </div>
                  <div className="wallet-details">
                    <span className="wallet-label">Wallet {index + 1}</span>
                    <span className="wallet-address">{`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}</span>
                  </div>
                </div>
                {connectedWallets.length > 1 && (
                  <button 
                    onClick={() => handleRemoveWallet(wallet.address)}
                    className="remove-wallet-button"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {connectedWallets.length < 3 && (
              <button onClick={handleConnectWallet} className="connect-wallet-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Connect Wallet ({connectedWallets.length}/3)
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

