import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useXP } from '../hooks/useXP';
import { useIntuition } from '../hooks/useIntuition';
import { useIntuitionData, IntuitionAtom, IntuitionTriple } from '../hooks/useIntuitionData';
import { useSocialConnections } from '../hooks/useSocialConnections';
import { LeaderboardService } from '../services/leaderboardService';
import { QuestService } from '../services/questService';
import { useQuery } from '@tanstack/react-query';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { showToast } from './Toast';
import './UserProfile.css';

const leaderboardService = new LeaderboardService(new QuestService());

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

export function UserProfile() {
  const { address, isConnected, status } = useAccount();
  const { totalXP, questsCompleted, claims } = useXP();
  const { claims: intuitionClaims } = useIntuition();
  const { getAtoms, getClaimsByCreator } = useIntuitionData();
  const { connections, connectSocialAccount, disconnectSocialAccount, isLoading: socialLoading, error: socialError } = useSocialConnections();

  const [fetchedAtoms, setFetchedAtoms] = useState<IntuitionAtom[]>([]);
  const [fetchedTriples, setFetchedTriples] = useState<IntuitionTriple[]>([]);
  const [isLoadingIntuition, setIsLoadingIntuition] = useState(false);
  const [hasLoadedIntuition, setHasLoadedIntuition] = useState(false);
  const lastFetchedAddress = useRef<string | null>(null);

  const { data: userRank } = useQuery({
    queryKey: ['user-rank', address],
    queryFn: () => leaderboardService.getUserRank(address!),
    enabled: !!address,
  });

  // Automatically fetch Intuition data when wallet connects
  useEffect(() => {
    if (!address) {
      setFetchedAtoms([]);
      setFetchedTriples([]);
      setHasLoadedIntuition(false);
      lastFetchedAddress.current = null;
      return;
    }

    // Skip if we already fetched for this address
    if (lastFetchedAddress.current === address.toLowerCase()) {
      return;
    }

    lastFetchedAddress.current = address.toLowerCase();
    let isMounted = true;

    const fetchIntuitionData = async () => {
      if (!isMounted) return;
      
      setIsLoadingIntuition(true);
      
      let atoms: typeof fetchedAtoms = [];
      let triples: typeof fetchedTriples = [];
      
      try {
        // Fetch atoms created by this address
        try {
          const atomsResult = await getAtoms({
            limit: 20,
            where: { creator_id: { _ilike: address.toLowerCase() } },
            orderBy: [{ created_at: 'desc' }],
          });
          if (isMounted) {
            atoms = atomsResult?.atoms || [];
          }
        } catch (atomError: any) {
          console.error('❌ Error fetching atoms:', atomError);
        }
        
        // Fetch triples/claims created by this address
        try {
          const triplesResult = await getClaimsByCreator(address, { limit: 20 });
          if (isMounted) {
            triples = triplesResult?.triples || [];
          }
        } catch (tripleError: any) {
          console.error('❌ Error fetching triples:', tripleError);
        }
        
        if (!isMounted) return;
        
        // Update state with results
        setFetchedAtoms(atoms);
        setFetchedTriples(triples);
        setHasLoadedIntuition(true);
        
      } catch (error: any) {
        if (!isMounted) return;
        console.error('❌ Fatal error fetching Intuition data:', error);
        setFetchedAtoms([]);
        setFetchedTriples([]);
        setHasLoadedIntuition(true);
      } finally {
        if (isMounted) {
          setIsLoadingIntuition(false);
        }
      }
    };

    fetchIntuitionData();

    return () => {
      isMounted = false;
    };
  }, [address]); // Only depend on address to prevent infinite loops

  // Check connection status - use address as primary indicator since it's more reliable
  // Show loading state while connecting
  if (status === 'connecting' || status === 'reconnecting') {
    return <div>Connecting wallet...</div>;
  }
  
  // If we have an address, show the profile (address is the most reliable indicator)
  // Don't rely on isConnected as it can be false even when wallet is connected
  if (!address) {
    return <div>Please connect your wallet to view your profile</div>;
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Social connections state
  const handleConnectSocial = async (platform: 'twitter' | 'discord') => {
    try {
      // Use the social connections hook to connect
      await connectSocialAccount(platform);
    } catch (error: any) {
      console.error(`Failed to connect ${platform}:`, error);
      // Show error to user
    }
  };

  const handleDisconnectSocial = async (platform: 'twitter' | 'discord') => {
    try {
      console.log(`Attempting to disconnect ${platform}...`);
      const result = await disconnectSocialAccount(platform);
      if (result.success) {
        console.log(`Successfully disconnected ${platform}`);
        showToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} account disconnected successfully`, 'success');
      } else {
        console.error(`Failed to disconnect ${platform}:`, result.error);
        showToast(`Failed to disconnect ${platform}: ${result.error}`, 'error');
      }
    } catch (error: any) {
      console.error(`Error disconnecting ${platform}:`, error);
      showToast(`Error disconnecting ${platform}: ${error.message || 'Unknown error'}`, 'error');
    }
  };


  const userProfileRef = useScrollAnimation();

  return (
    <div ref={userProfileRef} className="user-profile">
      <h2>Your Profile</h2>
      <div className="profile-info">
        <div className="profile-address">
          <strong>Address:</strong> {formatAddress(address)}
        </div>
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-label">Total IQ:</span>
            <span className="stat-value">{totalXP.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Quests Completed:</span>
            <span className="stat-value">{questsCompleted}</span>
          </div>
          {userRank && userRank > 0 && (
            <div className="stat-item">
              <span className="stat-label">Global Rank:</span>
              <span className="stat-value">#{userRank}</span>
            </div>
          )}
        </div>

        {/* Intuition Chain Identity Section */}
        <div className="profile-intuition-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            Intuition Chain Identity
          </h3>
          
          {isLoadingIntuition ? (
            <div className="profile-loading">
              <div className="profile-spinner"></div>
              <span>Loading identity from Intuition chain...</span>
            </div>
          ) : hasLoadedIntuition ? (
            <>
              {/* Identities Table */}
              <div className="profile-intuition-table-section">
                <h4 className="profile-intuition-table-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Identities ({fetchedAtoms.length})
                </h4>
                {fetchedAtoms.length > 0 ? (
                  <div className="profile-intuition-table-wrapper">
                    <table className="profile-intuition-table">
                      <thead>
                        <tr>
                          <th>Label</th>
                          <th>Type</th>
                          <th>Term ID</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fetchedAtoms.map((atom, index) => (
                          <tr key={atom.termId || index}>
                            <td>
                              <div className="profile-intuition-cell-with-emoji">
                                {atom.emoji && <span className="profile-intuition-emoji">{atom.emoji}</span>}
                                <span className="profile-intuition-label-text">{atom.label || '-'}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`profile-intuition-type-badge profile-intuition-type-${atom.type?.toLowerCase() || 'unknown'}`}>
                                {atom.type || 'Unknown'}
                              </span>
                            </td>
                            <td>
                              <code className="profile-intuition-code">{truncateId(atom.termId, 8, 6)}</code>
                            </td>
                            <td>{formatDate(atom.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="profile-intuition-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                      <line x1="4" y1="4" x2="20" y2="20"/>
                    </svg>
                    <p>No identities found for this wallet</p>
                  </div>
                )}
              </div>
              
              {/* Claims Table */}
              <div className="profile-intuition-table-section">
                <h4 className="profile-intuition-table-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  Claims ({fetchedTriples.length})
                </h4>
                {fetchedTriples.length > 0 ? (
                  <div className="profile-intuition-table-wrapper">
                    <table className="profile-intuition-table profile-intuition-claims-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Predicate</th>
                          <th>Object</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fetchedTriples.map((triple, index) => (
                          <tr key={triple.termId || index}>
                            <td>
                              <div className="profile-intuition-triple-cell">
                                {triple.subject.emoji && <span className="profile-intuition-emoji">{triple.subject.emoji}</span>}
                                <span>{triple.subject.label || truncateId(triple.subject.termId)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="profile-intuition-triple-cell profile-intuition-predicate">
                                {triple.predicate.emoji && <span className="profile-intuition-emoji">{triple.predicate.emoji}</span>}
                                <span>{triple.predicate.label || truncateId(triple.predicate.termId)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="profile-intuition-triple-cell">
                                {triple.object.emoji && <span className="profile-intuition-emoji">{triple.object.emoji}</span>}
                                <span>{triple.object.label || truncateId(triple.object.termId)}</span>
                              </div>
                            </td>
                            <td>{formatDate(triple.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="profile-intuition-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      <line x1="4" y1="4" x2="20" y2="20"/>
                    </svg>
                    <p>No claims found for this wallet</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Social Connections Section */}
        <div className="profile-social-connections">
          <h3>Social Connections</h3>
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
                  {connections.twitter ? (
                    <span className="social-status connected">
                      Connected as @{connections.twitter.username}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button
                className="connect-button"
                onClick={connections.twitter ? () => handleDisconnectSocial('twitter') : () => handleConnectSocial('twitter')}
              >
                {connections.twitter ? 'Disconnect' : 'Connect'}
              </button>
            </div>

            {/* Discord */}
            <div className="social-item">
              <div className="social-info">
                <div className="social-icon discord-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.299 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.032-.0542c.5-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </div>
                <div className="social-details">
                  <span className="social-name">Discord</span>
                  {connections.discord ? (
                    <span className="social-status connected">
                      Connected as {connections.discord.username}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button
                className="connect-button"
                onClick={connections.discord ? () => handleDisconnectSocial('discord') : () => handleConnectSocial('discord')}
              >
                {connections.discord ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-claims">
          <h3>Intuition Claims</h3>
          {claims.length === 0 ? (
            <p>No claims yet. Complete quests to earn claims!</p>
          ) : (
            <ul>
              {claims.map((claim, index) => (
                <li key={index}>
                  Quest: {claim.questId.slice(0, 8)}... | IQ: {claim.xpAmount} |{' '}
                  {new Date(claim.timestamp).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
