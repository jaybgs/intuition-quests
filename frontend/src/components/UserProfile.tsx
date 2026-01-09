import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useXP } from '../hooks/useXP';
import { useIntuition } from '../hooks/useIntuition';
import { useIntuitionData, IntuitionAtom, IntuitionTriple } from '../hooks/useIntuitionData';
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
