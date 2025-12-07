import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useTrustBalance } from '../hooks/useTrustBalance';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { useUserXP } from '../hooks/useUserXP';
import { useUserActivity } from '../hooks/useUserActivity';
import { useSocialConnections } from '../hooks/useSocialConnections';
import { useIntuitionData, IntuitionAtom, IntuitionTriple } from '../hooks/useIntuitionData';
import { showToast } from './Toast';

interface UserDashboardProps {
  onEditProfile: () => void;
}

interface ConnectedWallet {
  address: string;
  chainId?: number;
}

interface WalletIntuitionData {
  walletAddress: string;
  atoms: IntuitionAtom[];
  triples: IntuitionTriple[];
  isLoading: boolean;
  hasLoaded: boolean;
}

// Helper to get connected wallets from localStorage
const getConnectedWallets = (): ConnectedWallet[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const stored = localStorage.getItem('connected_wallets');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading connected wallets:', error);
  }
  return [];
};

// Helper to save connected wallets to localStorage
const saveConnectedWallets = (wallets: ConnectedWallet[]): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem('connected_wallets', JSON.stringify(wallets));
  } catch (error) {
    console.error('Error saving connected wallets:', error);
  }
};

// Helper to add a wallet to the connected wallets list
const addConnectedWallet = (address: string): void => {
  const wallets = getConnectedWallets();
  const addressLower = address.toLowerCase();
  // Check if wallet already exists
  if (!wallets.some(w => w.address.toLowerCase() === addressLower)) {
    wallets.push({ address });
    saveConnectedWallets(wallets);
  }
};

// Helper to truncate addresses/IDs
const truncateId = (id: string, startChars: number = 6, endChars: number = 4): string => {
  if (id.length <= startChars + endChars + 3) return id;
  return `${id.slice(0, startChars)}...${id.slice(-endChars)}`;
};

// Helper to format date
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

export function UserDashboard({ onEditProfile }: UserDashboardProps) {
  const { address } = useAccount();
  const { balance, isLoading: isBalanceLoading, contractNotFound, contractNotDeployed, isUsingNativeBalance } = useTrustBalance();
  const { userXP: userXPData, isLoading: isXPLoading } = useUserXP();
  const { getAtoms, getClaimsByCreator, getIdentityByAddress, getTriples, getStakedClaimsCount } = useIntuitionData();

  // Track connected wallets
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>(() => {
    const wallets = getConnectedWallets();
    // Always include current wallet if connected
    if (address && !wallets.some(w => w.address.toLowerCase() === address.toLowerCase())) {
      wallets.push({ address });
      saveConnectedWallets(wallets);
    }
    return wallets;
  });

  // Track intuition data for each wallet
  const [walletIntuitionData, setWalletIntuitionData] = useState<Map<string, WalletIntuitionData>>(new Map());
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set([address?.toLowerCase() || '']));
  const fetchingWallets = useRef<Set<string>>(new Set());

  // Get XP data from backend or use defaults
  // Calculate total claimed IQ from localStorage for immediate display
  const [localClaimedIQ, setLocalClaimedIQ] = useState(0);
  
  // Track staked claims count from Intuition
  const [stakedClaimsCount, setStakedClaimsCount] = useState(0);
  
  // Track quest completions count from database
  const [questsCompletedCount, setQuestsCompletedCount] = useState(0);
  
  // Store previous stats to prevent flickering during loading
  const [previousStats, setPreviousStats] = useState({
    claimsStaked: 0,
    tasksCompleted: 0,
    tradeVolume: 0,
  });
  
  useEffect(() => {
    if (address) {
      const claimedQuests = JSON.parse(localStorage.getItem(`claimed_quests_${address.toLowerCase()}`) || '[]');
      // For now, we'll use the backend data primarily, but this ensures we show something if backend is slow
      // The backend should have the correct total, but we keep this as a fallback
      setLocalClaimedIQ(claimedQuests.length * 20); // Assuming 20 IQ per quest for now
    }
  }, [address]);
  
  const userXP = userXPData?.totalXP || localClaimedIQ || 0;
  const level = userXPData?.level || Math.floor(userXP / 100) + 1;
  const currentLevelXP = userXP % 100;
  const possibleXP = 100; // EXP needed for current level
  const shards = Math.floor(userXP / 10); // 10 IQ points = 1 shard

  // Fetch staked claims count when address changes
  useEffect(() => {
    const fetchStakedClaims = async () => {
      if (address) {
        try {
          const count = await getStakedClaimsCount(address);
          setStakedClaimsCount(count);
          // Update previous stats to prevent flickering
          setPreviousStats(prev => ({ ...prev, claimsStaked: count }));
        } catch (error) {
          console.error('Error fetching staked claims count:', error);
        }
      } else {
        setStakedClaimsCount(0);
      }
    };
    fetchStakedClaims();
  }, [address, getStakedClaimsCount]);

  // Fetch quest completions count from database when address changes
  useEffect(() => {
    const fetchQuestsCompleted = async () => {
      if (address) {
        try {
          const count = await apiClient.getUserCompletionsCount(address);
          setQuestsCompletedCount(count);
          // Update previous stats to prevent flickering
          setPreviousStats(prev => ({ ...prev, tasksCompleted: count }));
        } catch (error) {
          console.error('Error fetching quest completions count:', error);
        }
      } else {
        setQuestsCompletedCount(0);
      }
    };
    fetchQuestsCompleted();
  }, [address]);

  // Get user stats from backend or use defaults
  // Use previous values during loading to prevent flickering
  // Use stakedClaimsCount from Intuition and questsCompletedCount from database
  const currentStats = {
    claimsStaked: stakedClaimsCount || previousStats.claimsStaked,
    tasksCompleted: questsCompletedCount || previousStats.tasksCompleted,
    tradeVolume: userXPData?.tradeVolume ? parseFloat(userXPData.tradeVolume.toString()) : previousStats.tradeVolume,
  };

  // Update previous stats when new data arrives (except claimsStaked and tasksCompleted which come from separate sources)
  useEffect(() => {
    if (userXPData && !isXPLoading) {
      setPreviousStats(prev => ({
        ...prev,
        tradeVolume: userXPData.tradeVolume ? parseFloat(userXPData.tradeVolume.toString()) : 0,
      }));
    }
  }, [userXPData, isXPLoading]);

  const userStats = currentStats;

  // Get user activity from backend
  const { activity: userActivity, isLoading: isActivityLoading } = useUserActivity();

  // Get username from localStorage
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

  // Helper to truncate username to 7 characters for display
  const truncateUsername = (username: string | null, maxLength: number = 7): string => {
    if (!username) return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'User';
    return username.length > maxLength ? username.slice(0, maxLength) : username;
  };

  // Get profile picture and username from localStorage
  const profilePicture = getStoredProfilePic(address);
  const storedUsername = getStoredUsername(address);
  const username = truncateUsername(storedUsername);

  // Social connections
  const {
    connections,
    isConnecting,
    connectTwitter,
    connectDiscord,
    connectEmail,
    connectGithub,
    disconnect,
  } = useSocialConnections();

  const handleConnectTwitter = async () => {
    const result = await connectTwitter();
    if (result.success) {
      showToast('Twitter connected successfully!', 'success');
    } else {
      showToast('Failed to connect Twitter. Please try again.', 'error');
    }
  };

  const handleConnectDiscord = async () => {
    const result = await connectDiscord();
    if (result.success) {
      showToast('Discord connected successfully!', 'success');
    } else {
      showToast('Failed to connect Discord. Please try again.', 'error');
    }
  };

  const handleConnectEmail = async () => {
    const result = await connectEmail();
    if (result.success) {
      showToast('Email connected successfully!', 'success');
    } else {
      showToast('Failed to connect Email. Please try again.', 'error');
    }
  };

  const handleConnectGithub = async () => {
    const result = await connectGithub();
    if (result.success) {
      showToast('GitHub connected successfully!', 'success');
    } else {
      showToast('Failed to connect GitHub. Please try again.', 'error');
    }
  };

  const handleDisconnectSocial = (platform: 'twitter' | 'discord' | 'email' | 'github') => {
    disconnect(platform);
    showToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected`, 'info');
  };

  // Update connected wallets when address changes
  useEffect(() => {
    if (address) {
      addConnectedWallet(address);
      const wallets = getConnectedWallets();
      setConnectedWallets(wallets);
      // Expand current wallet by default
      setExpandedWallets(prev => new Set([...prev, address.toLowerCase()]));
    }
  }, [address]);

  // Fetch Intuition data for all connected wallets
  useEffect(() => {
    const fetchAllWalletsData = async () => {
      const wallets = getConnectedWallets();
      if (wallets.length === 0) return;

      // Fetch data for each wallet
      for (const wallet of wallets) {
        const walletAddress = wallet.address.toLowerCase();
        
        // Skip if already loaded or currently fetching
        const existing = walletIntuitionData.get(walletAddress);
        if (existing?.hasLoaded || fetchingWallets.current.has(walletAddress)) {
          continue;
        }
        
        // Mark as fetching
        fetchingWallets.current.add(walletAddress);

        // Set loading state
        setWalletIntuitionData(prev => {
          const newMap = new Map(prev);
          newMap.set(walletAddress, {
            walletAddress: wallet.address,
            atoms: [],
            triples: [],
            isLoading: true,
            hasLoaded: false,
          });
          return newMap;
        });

        try {
          let atoms: IntuitionAtom[] = [];
          let triples: IntuitionTriple[] = [];

          // Fetch identity by wallet address
          let identityAtom: IntuitionAtom | null = null;
          try {
            identityAtom = await getIdentityByAddress(wallet.address);
            if (identityAtom) {
              atoms = [identityAtom];
            }
          } catch (identityError: any) {
            console.error(`❌ Error fetching identity for ${walletAddress}:`, identityError);
          }

          // Fetch atoms created by this address
          try {
            const atomsResult = await getAtoms({
              limit: 20,
              where: { creator_id: { _ilike: walletAddress } },
              orderBy: [{ created_at: 'desc' }],
            });
            if (atomsResult?.atoms) {
              const existingIds = new Set(atoms.map(a => a.termId));
              const newAtoms = atomsResult.atoms.filter(a => !existingIds.has(a.termId));
              atoms = [...atoms, ...newAtoms];
            }
          } catch (atomError: any) {
            console.error(`❌ Error fetching atoms for ${walletAddress}:`, atomError);
          }

          // Fetch triples where identity is the subject
          if (identityAtom) {
            try {
              const subjectTriples = await getTriples({
                limit: 20,
                where: { subject_id: { _eq: identityAtom.termId } },
                orderBy: [{ created_at: 'desc' }],
              });
              if (subjectTriples?.triples) {
                triples = subjectTriples.triples;
              }
            } catch (subjectTripleError: any) {
              console.error(`❌ Error fetching subject triples for ${walletAddress}:`, subjectTripleError);
            }
          }

          // Fetch triples created by this address
          try {
            const triplesResult = await getClaimsByCreator(wallet.address, { limit: 20 });
            if (triplesResult?.triples) {
              const existingIds = new Set(triples.map(t => t.termId));
              const newTriples = triplesResult.triples.filter(t => !existingIds.has(t.termId));
              triples = [...triples, ...newTriples];
            }
          } catch (tripleError: any) {
            console.error(`❌ Error fetching triples for ${walletAddress}:`, tripleError);
          }

          // Update state
          setWalletIntuitionData(prev => {
            const newMap = new Map(prev);
            newMap.set(walletAddress, {
              walletAddress: wallet.address,
              atoms,
              triples,
              isLoading: false,
              hasLoaded: true,
            });
            return newMap;
          });
        } catch (error: any) {
          console.error(`❌ Fatal error fetching data for ${walletAddress}:`, error);
          setWalletIntuitionData(prev => {
            const newMap = new Map(prev);
            newMap.set(walletAddress, {
              walletAddress: wallet.address,
              atoms: [],
              triples: [],
              isLoading: false,
              hasLoaded: true,
            });
            return newMap;
          });
        } finally {
          // Remove from fetching set
          fetchingWallets.current.delete(walletAddress);
        }
      }
    };

    fetchAllWalletsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedWallets.length]);

  // Toggle wallet expansion
  const toggleWalletExpansion = (walletAddress: string) => {
    setExpandedWallets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(walletAddress.toLowerCase())) {
        newSet.delete(walletAddress.toLowerCase());
      } else {
        newSet.add(walletAddress.toLowerCase());
      }
      return newSet;
    });
  };

  return (
    <div className="user-dashboard">
      {/* Edit Profile Button - Outside Rectangle */}
      <div className="user-details-header">
        <button onClick={onEditProfile} className="edit-profile-button-galxe">
          Edit Profile
        </button>
      </div>

      {/* User Details Section - Galxe Style */}
      <div className="user-details-section">
        <div className="user-details-content">
          <div className="user-avatar-large">
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            )}
          </div>
          <div className="user-info-main">
            <div className="user-name-row">
              <h1 className="user-name">{truncateUsername(username, 7)}</h1>
              
              {/* IQ Progress Bar */}
              <div className="iq-progress-container">
                {/* Hexagon Icon */}
                <img 
                  src="/hexagon.svg" 
                  alt="Hexagon" 
                  className="iq-hexagon-icon"
                />
                <div className="iq-progress-bar-wrapper">
                  <div 
                    className="iq-progress-bar-fill"
                    style={{
                      width: `${Math.min(100, (currentLevelXP / possibleXP) * 100)}%`,
                    }}
                  />
                </div>
                <span className="iq-progress-text">
                  {currentLevelXP} / {possibleXP} IQ
                </span>
              </div>
              
              {/* Shard Count Display */}
              <div className="user-shard-count" style={{ flexShrink: 0 }}>
                <img src="/shard.svg" alt="Shard" className="shard-icon" />
                <span className="shard-count-value">{shards}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">

        {/* User Stats Section */}
        <div className="stats-section-no-bg">
          <div className="stat-rectangle">
            <span className="stat-label">Claims</span>
            <span className="stat-value">{userStats.claimsStaked}</span>
          </div>
          <div className="stat-rectangle">
            <span className="stat-label">Tasks Completed</span>
            <span className="stat-value">{userStats.tasksCompleted}</span>
          </div>
          <div className="stat-rectangle">
            <span className="stat-label">Trade Volume</span>
            <span className="stat-value">${userStats.tradeVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Social Connections Section */}
        <div className="section-no-bg">
          <div className="section-header-with-tabs">
            <h3 className="section-title">Social Connections</h3>
          </div>
          <div className="social-connections">
            {/* Twitter */}
            <div className="social-item">
              <div className="social-info">
                <div className="social-icon twitter-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div className="social-details">
                  <span className="social-name">Twitter</span>
                  {connections.twitter && connections.twitter.username ? (
                    <span className="social-status connected">
                      @{connections.twitter.username}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button 
                className="connect-button"
                onClick={connections.twitter ? () => handleDisconnectSocial('twitter') : handleConnectTwitter}
                disabled={isConnecting === 'twitter'}
              >
                {isConnecting === 'twitter' ? 'Connecting...' : connections.twitter ? 'Disconnect' : 'Connect'}
              </button>
            </div>

            {/* Discord */}
            <div className="social-item">
              <div className="social-info">
                <div className="social-icon discord-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                <div className="social-details">
                  <span className="social-name">Discord</span>
                  {connections.discord && connections.discord.username ? (
                    <span className="social-status connected">
                      {connections.discord.username}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button 
                className="connect-button"
                onClick={connections.discord ? () => handleDisconnectSocial('discord') : handleConnectDiscord}
                disabled={isConnecting === 'discord'}
              >
                {isConnecting === 'discord' ? 'Connecting...' : connections.discord ? 'Disconnect' : 'Connect'}
              </button>
            </div>

            {/* Email */}
            <div className="social-item">
              <div className="social-info">
                <div className="social-icon email-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div className="social-details">
                  <span className="social-name">Gmail</span>
                  {connections.email && connections.email.email ? (
                    <span className="social-status connected">
                      {connections.email.email}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button 
                className="connect-button"
                onClick={connections.email ? () => handleDisconnectSocial('email') : handleConnectEmail}
                disabled={isConnecting === 'email'}
              >
                {isConnecting === 'email' ? 'Connecting...' : connections.email ? 'Disconnect' : 'Connect'}
              </button>
            </div>

            {/* GitHub */}
            <div className="social-item">
              <div className="social-info">
                <div className="social-icon github-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <div className="social-details">
                  <span className="social-name">GitHub</span>
                  {connections.github && connections.github.username ? (
                    <span className="social-status connected">
                      @{connections.github.username}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button 
                className="connect-button"
                onClick={connections.github ? () => handleDisconnectSocial('github') : handleConnectGithub}
                disabled={isConnecting === 'github'}
              >
                {isConnecting === 'github' ? 'Connecting...' : connections.github ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        </div>

        {/* Intuition Chain Identity Section - Multi-Wallet Display */}
        <div className="section-no-bg">
          <div className="section-header-with-tabs">
            <h3 className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              Intuition Chain Identity
            </h3>
          </div>
          
          {!address ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: '12px' }}>
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <p style={{ margin: 0, fontSize: '14px' }}>Please connect your wallet</p>
            </div>
          ) : (() => {
                const walletAddressLower = address.toLowerCase();
                const walletData = walletIntuitionData.get(walletAddressLower);
                const isExpanded = expandedWallets.has(walletAddressLower);
                const isLoading = walletData?.isLoading ?? true;
                const hasLoaded = walletData?.hasLoaded ?? false;
                const atoms = walletData?.atoms ?? [];
                const triples = walletData?.triples ?? [];

                return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div key={address} style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    {/* Wallet Header */}
                    <button
                  onClick={() => toggleWalletExpansion(address)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="6" width="20" height="12" rx="2"/>
                            <path d="M6 10h12M6 14h8"/>
                          </svg>
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>
                        {truncateId(address, 8, 6)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {isLoading ? (
                          <span>Loading...</span>
                        ) : (
                          <>
                            <span>{atoms.length} {atoms.length === 1 ? 'Identity' : 'Identities'}</span>
                            <span>•</span>
                            <span>{triples.length} {triples.length === 1 ? 'Claim' : 'Claims'}</span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Wallet Content */}
                    {isExpanded && (
                      <div style={{ padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {isLoading && !hasLoaded ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', color: 'var(--text-secondary)', fontSize: '15px' }}>
                            <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255, 255, 255, 0.3)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
                            <span>Loading identity from Intuition chain...</span>
                          </div>
                        ) : (
                          <>
                            {/* Identities Table */}
                            <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                              <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent-blue)' }}>
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                  <circle cx="12" cy="7" r="4"/>
                                </svg>
                                Identities ({atoms.length})
                              </h4>
                              {atoms.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Label</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Type</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Term ID</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Created</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {atoms.map((atom, index) => (
                                        <tr key={atom.termId || index} style={{ transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {atom.emoji && <span style={{ fontSize: '18px', lineHeight: 1 }}>{atom.emoji}</span>}
                                              <span style={{ fontWeight: 500 }}>{atom.label || '-'}</span>
                                            </div>
                                          </td>
                                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', verticalAlign: 'middle' }}>
                                            <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', background: atom.type?.toLowerCase() === 'account' ? 'rgba(251, 191, 36, 0.15)' : atom.type?.toLowerCase() === 'person' ? 'rgba(168, 85, 247, 0.15)' : atom.type?.toLowerCase() === 'organization' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: atom.type?.toLowerCase() === 'account' ? '#fbbf24' : atom.type?.toLowerCase() === 'person' ? '#a855f7' : atom.type?.toLowerCase() === 'organization' ? '#22c55e' : '#3b82f6' }}>
                                              {atom.type || 'Unknown'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', verticalAlign: 'middle' }}>
                                            <code style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '12px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', color: 'var(--text-secondary)' }}>{truncateId(atom.termId, 8, 6)}</code>
                                          </td>
                                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', verticalAlign: 'middle' }}>{formatDate(atom.createdAt)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                              <p style={{ margin: 0 }}>No identities found for this address</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Claims Table */}
                            <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '12px', overflow: 'hidden' }}>
                              <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent-purple)' }}>
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                                Claims ({triples.length})
                              </h4>
                              {triples.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                      <tr>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Subject</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Predicate</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Object</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Created</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {triples.map((triple, index) => (
                                        <tr key={triple.termId || index} style={{ transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', verticalAlign: 'middle' }}>
                                        <code style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '12px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', color: 'var(--text-secondary)' }}>{truncateId(triple.subjectId, 8, 6)}</code>
                                          </td>
                                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', verticalAlign: 'middle' }}>
                                        <code style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '12px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', color: 'var(--text-secondary)' }}>{truncateId(triple.predicateId, 8, 6)}</code>
                                          </td>
                                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', verticalAlign: 'middle' }}>
                                        <code style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '12px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', color: 'var(--text-secondary)' }}>{truncateId(triple.objectId, 8, 6)}</code>
                                          </td>
                                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', verticalAlign: 'middle' }}>{formatDate(triple.createdAt)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                              <p style={{ margin: 0 }}>No claims found for this address</p>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
            </div>
          )})()}
        </div>

        {/* User Activity Section */}
        <div className="section-no-bg">
          <div className="section-header-with-tabs">
            <h3 className="section-title">User Activity</h3>
          </div>

          <div className="activity-list">
            {isActivityLoading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255, 255, 255, 0.3)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 12px' }}></div>
                <p style={{ margin: 0, fontSize: '14px' }}>Loading activity...</p>
              </div>
            ) : userActivity.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>No activity found</p>
              </div>
            ) : (
              userActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'quest_completed' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  )}
                    {activity.type === 'deposit' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  )}
                    {activity.type === 'redemption' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22v-20M6 19H13.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H18"/>
                      </svg>
                    )}
                    {activity.type === 'atom_created' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="2" x2="12" y2="6"/>
                        <line x1="12" y1="18" x2="12" y2="22"/>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                        <line x1="2" y1="12" x2="6" y2="12"/>
                        <line x1="18" y1="12" x2="22" y2="12"/>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                      </svg>
                    )}
                    {activity.type === 'triple_created' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  )}
                </div>
                <div className="activity-content">
                  <span className="activity-title">{activity.title}</span>
                  <span className="activity-time">
                    {activity.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {activity.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                    {activity.transactionHash && (
                      <a
                        href={`https://explorer.intuition.systems/tx/${activity.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--accent-blue)', textDecoration: 'none', marginTop: '4px', display: 'block' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View on Explorer →
                      </a>
                    )}
                </div>
                  {activity.xp && activity.xp > 0 && (
                  <div className="activity-xp">
                    +{activity.xp} IQ
                  </div>
                )}
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

