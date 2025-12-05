import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useXP } from '../hooks/useXP';
import { useIntuition } from '../hooks/useIntuition';
import { useIntuitionData, IntuitionAtom, IntuitionTriple } from '../hooks/useIntuitionData';
import { LeaderboardService } from '../services/leaderboardService';
import { QuestService } from '../services/questService';
import { useQuery } from '@tanstack/react-query';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
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
  const connectedAccounts = {
    twitter: null,
    discord: null,
    email: null,
    github: null,
  };

  const handleConnectTwitter = () => {
    // Implement Twitter connection via Privy
    console.log('Connect Twitter');
  };

  const handleConnectDiscord = () => {
    // Implement Discord connection via Privy
    console.log('Connect Discord');
  };

  const handleConnectEmail = () => {
    // Implement Email connection via Privy
    console.log('Connect Email');
  };

  const handleConnectGithub = () => {
    // Implement GitHub connection via Privy
    console.log('Connect GitHub');
  };

  const handleDisconnectSocial = (platform: 'twitter' | 'discord' | 'email' | 'github') => {
    // Implement disconnect logic
    console.log(`Disconnect ${platform}`);
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
                  {connectedAccounts.twitter ? (
                    <span className="social-status connected">
                      Connected as @{connectedAccounts.twitter.username}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button 
                className="connect-button"
                onClick={connectedAccounts.twitter ? () => handleDisconnectSocial('twitter') : handleConnectTwitter}
              >
                {connectedAccounts.twitter ? 'Disconnect' : 'Connect'}
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
                  {connectedAccounts.discord ? (
                    <span className="social-status connected">
                      Connected as {connectedAccounts.discord.username}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button 
                className="connect-button"
                onClick={connectedAccounts.discord ? () => handleDisconnectSocial('discord') : handleConnectDiscord}
              >
                {connectedAccounts.discord ? 'Disconnect' : 'Connect'}
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
                  {connectedAccounts.email ? (
                    <span className="social-status connected">
                      Connected as {connectedAccounts.email.address}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button 
                className="connect-button"
                onClick={connectedAccounts.email ? () => handleDisconnectSocial('email') : handleConnectEmail}
              >
                {connectedAccounts.email ? 'Disconnect' : 'Connect'}
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
                  {connectedAccounts.github ? (
                    <span className="social-status connected">
                      Connected as @{connectedAccounts.github.username}
                    </span>
                  ) : (
                    <span className="social-status disconnected">Not connected</span>
                  )}
                </div>
              </div>
              <button 
                className="connect-button"
                onClick={connectedAccounts.github ? () => handleDisconnectSocial('github') : handleConnectGithub}
              >
                {connectedAccounts.github ? 'Disconnect' : 'Connect'}
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
