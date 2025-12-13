import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useTrustBalance } from '../hooks/useTrustBalance';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { useUserXP } from '../hooks/useUserXP';
import { useUserActivity } from '../hooks/useUserActivity';
import { useIntuitionData, IntuitionAtom, IntuitionTriple } from '../hooks/useIntuitionData';
import { useSocialConnections } from '../hooks/useSocialConnections';
import { showToast } from './Toast';
import { truncateUsername } from '../utils/usernameUtils';
import { getDiceBearAvatar } from '../utils/avatar';

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
  const {
    connections,
    isConnecting,
    connectTwitter,
    connectDiscord,
    connectGithub,
    connectGoogle,
    disconnect: disconnectSocial
  } = useSocialConnections();

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

  // Get profile picture and username from localStorage
  const profilePicture = getStoredProfilePic(address);
  const storedUsername = getStoredUsername(address);
  const username = truncateUsername(storedUsername);

  // Social connections

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

  // Social connection handlers
  const handleConnectTwitter = async () => {
    const result = await connectTwitter();
    if (result.success) {
      showToast('Redirecting to Twitter...', 'info');
    } else {
      showToast(`Failed to connect Twitter: ${result.error}`, 'error');
    }
  };

  const handleConnectDiscord = async () => {
    const result = await connectDiscord();
    if (result.success) {
      showToast('Redirecting to Discord...', 'info');
    } else {
      showToast(`Failed to connect Discord: ${result.error}`, 'error');
    }
  };

  const handleConnectGithub = async () => {
    const result = await connectGithub();
    if (result.success) {
      showToast('Redirecting to GitHub...', 'info');
    } else {
      showToast(`Failed to connect GitHub: ${result.error}`, 'error');
    }
  };

  const handleConnectGoogle = async () => {
    const result = await connectGoogle();
    if (result.success) {
      showToast('Redirecting to Google...', 'info');
    } else {
      showToast(`Failed to connect Google: ${result.error}`, 'error');
    }
  };

  const handleDisconnectSocial = async (platform: 'twitter' | 'discord' | 'github' | 'google') => {
    const result = await disconnectSocial(platform);
    if (result.success) {
      showToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected`, 'success');
    } else {
      showToast(`Failed to disconnect ${platform}: ${result.error}`, 'error');
    }
  };

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

  console.log('UserDashboard rendering, onEditProfile available:', !!onEditProfile);

  return (
    <div className="user-dashboard">
      {/* Edit Profile Button - Outside Rectangle */}
      <div className="user-details-header">
        <button
          onClick={() => {
            console.log('Edit Profile button clicked');
            console.log('onEditProfile function:', onEditProfile);
            if (onEditProfile) {
              onEditProfile();
            } else {
              console.error('onEditProfile is undefined!');
            }
          }}
          className="edit-profile-button-galxe"
        >
          Edit Profile
        </button>
      </div>

      {/* User Details Section - Galxe Style */}
      <div className="user-details-section">
        <div className="user-details-content">
          <div className="user-avatar-large">
            <img 
              src={profilePicture || getDiceBearAvatar(address || 'anonymous')} 
              alt="Profile" 
              className="avatar-image" 
            />
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
                    onClick={() => handleDisconnectSocial('twitter')}
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
                    onClick={() => handleDisconnectSocial('discord')}
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
                    onClick={() => handleDisconnectSocial('github')}
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
                    onClick={() => handleDisconnectSocial('google')}
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
                    <img src="/verified.svg" alt="Verified" width="20" height="20" />
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

