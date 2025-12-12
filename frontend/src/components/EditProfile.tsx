import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { apiClient } from '../services/apiClient';
import { useSocialConnections } from '../hooks/useSocialConnections';

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
  const {
    connections,
    currentUser,
    isConnecting,
    connectTwitter,
    connectDiscord,
    connectGithub,
    connectGoogle,
    disconnect: disconnectSocial,
    signOut
  } = useSocialConnections();
  
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

  // Social connection handlers
  const handleConnectTwitter = async () => {
    const result = await connectTwitter();
    if (result.success) {
      setSaveMessage('Redirecting to Twitter...');
    } else {
      setSaveMessage(`Failed to connect Twitter: ${result.error}`);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleConnectDiscord = async () => {
    const result = await connectDiscord();
    if (result.success) {
      setSaveMessage('Redirecting to Discord...');
    } else {
      setSaveMessage(`Failed to connect Discord: ${result.error}`);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleConnectGithub = async () => {
    const result = await connectGithub();
    if (result.success) {
      setSaveMessage('Redirecting to GitHub...');
    } else {
      setSaveMessage(`Failed to connect GitHub: ${result.error}`);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleConnectGoogle = async () => {
    const result = await connectGoogle();
    if (result.success) {
      setSaveMessage('Redirecting to Google...');
    } else {
      setSaveMessage(`Failed to connect Google: ${result.error}`);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleDisconnectSocial = async () => {
    const result = await signOut();
    if (result.success) {
      setSaveMessage('Signed out successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage(`Failed to sign out: ${result.error}`);
      setTimeout(() => setSaveMessage(null), 5000);
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

        {/* Social Connections Section */}
        <div className="edit-section">
          <h2 className="section-title">Social Connections</h2>
          <p className="section-description">Connect your social accounts for enhanced features</p>

          <div className="social-connections-grid">
            {/* Twitter */}
            <div className="social-connection-item">
              <div className="social-connection-header">
                <div className="social-connection-icon twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div className="social-connection-info">
                  <h3 className="social-connection-name">Twitter/X</h3>
                  {connections.twitter ? (
                    <p className="social-connection-status connected">
                      @{connections.twitter.username}
                    </p>
                  ) : (
                    <p className="social-connection-status">Not connected</p>
                  )}
                </div>
              </div>
              <div className="social-connection-actions">
                {connections.twitter ? (
                  <button
                    onClick={handleDisconnectSocial}
                    className="social-disconnect-button"
                    disabled={!!isConnecting}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnectTwitter}
                    className="social-connect-button twitter"
                    disabled={!!isConnecting}
                  >
                    {isConnecting === 'twitter' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            {/* Discord */}
            <div className="social-connection-item">
              <div className="social-connection-header">
                <div className="social-connection-icon discord">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </div>
                <div className="social-connection-info">
                  <h3 className="social-connection-name">Discord</h3>
                  {connections.discord ? (
                    <p className="social-connection-status connected">
                      @{connections.discord.username}
                    </p>
                  ) : (
                    <p className="social-connection-status">Not connected</p>
                  )}
                </div>
              </div>
              <div className="social-connection-actions">
                {connections.discord ? (
                  <button
                    onClick={handleDisconnectSocial}
                    className="social-disconnect-button"
                    disabled={!!isConnecting}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnectDiscord}
                    className="social-connect-button discord"
                    disabled={!!isConnecting}
                  >
                    {isConnecting === 'discord' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            {/* GitHub */}
            <div className="social-connection-item">
              <div className="social-connection-header">
                <div className="social-connection-icon github">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <div className="social-connection-info">
                  <h3 className="social-connection-name">GitHub</h3>
                  {connections.github ? (
                    <p className="social-connection-status connected">
                      @{connections.github.username}
                    </p>
                  ) : (
                    <p className="social-connection-status">Not connected</p>
                  )}
                </div>
              </div>
              <div className="social-connection-actions">
                {connections.github ? (
                  <button
                    onClick={handleDisconnectSocial}
                    className="social-disconnect-button"
                    disabled={!!isConnecting}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGithub}
                    className="social-connect-button github"
                    disabled={!!isConnecting}
                  >
                    {isConnecting === 'github' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            {/* Google */}
            <div className="social-connection-item">
              <div className="social-connection-header">
                <div className="social-connection-icon google">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="social-connection-info">
                  <h3 className="social-connection-name">Google</h3>
                  {connections.google ? (
                    <p className="social-connection-status connected">
                      {connections.google.email}
                    </p>
                  ) : (
                    <p className="social-connection-status">Not connected</p>
                  )}
                </div>
              </div>
              <div className="social-connection-actions">
                {connections.google ? (
                  <button
                    onClick={handleDisconnectSocial}
                    className="social-disconnect-button"
                    disabled={!!isConnecting}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    className="social-connect-button google"
                    disabled={!!isConnecting}
                  >
                    {isConnecting === 'google' ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
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

