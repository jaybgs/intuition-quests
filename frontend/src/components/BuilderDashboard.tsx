import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { spaceService } from '../services/spaceService';
import type { Space } from '../types';
import { useQuests } from '../hooks/useQuests';
import { useBuilderStats } from '../hooks/useBuilderStats';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useSubscription } from '../hooks/useSubscription';
import { BuilderSettings } from './BuilderSettings';
import { BuilderQuests } from './BuilderQuests';
import { BuilderAnalytics } from './BuilderAnalytics';
import './BuilderDashboard.css';

interface BuilderDashboardProps {
  spaceId: string;
  onBack?: () => void;
}

export function BuilderDashboard({ spaceId, onBack }: BuilderDashboardProps) {
  const { address } = useAccount();
  const [space, setSpace] = useState<Space | null>(null);
  const [activeNav, setActiveNav] = useState<'dashboard' | 'quests' | 'guide' | 'settings' | 'analytics'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { quests } = useQuests();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const { isPro } = useSubscription();

  useEffect(() => {
    // Handle empty string or null spaceId
    if (!spaceId || spaceId.trim() === '') {
      // If no spaceId provided, try to get user's first space
      if (address) {
        spaceService.getSpacesByOwner(address).then(userSpaces => {
          if (userSpaces.length > 0) {
            // Use the first space
            const firstSpace = userSpaces[0];
            setSpace(firstSpace);
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
            if (onBack) {
              setTimeout(() => onBack(), 1000); // Give user time to see the message
            }
          }
        }).catch(error => {
          console.error('Error loading user spaces:', error);
          setIsAuthorized(false);
          if (onBack) {
            setTimeout(() => onBack(), 1000);
          }
        });
      } else {
        setIsAuthorized(false);
        if (onBack) {
          setTimeout(() => onBack(), 1000);
        }
      }
      return;
    }

    if (spaceId && address) {
      spaceService.getSpaceById(spaceId).then(loadedSpace => {
        if (loadedSpace) {
          // Check if the space has ownerAddress
          if (!loadedSpace.ownerAddress) {
            console.error('Space does not have ownerAddress:', loadedSpace);
            // Try to get user's first space instead
            spaceService.getSpacesByOwner(address).then(userSpaces => {
              if (userSpaces.length > 0) {
                setSpace(userSpaces[0]);
                setIsAuthorized(true);
              } else {
                setIsAuthorized(false);
                if (onBack) {
                  setTimeout(() => onBack(), 1000);
                }
              }
            }).catch(error => {
              console.error('Error loading user spaces:', error);
              setIsAuthorized(false);
              if (onBack) {
                setTimeout(() => onBack(), 1000);
              }
            });
            return;
          }
          
          // Check if the connected wallet is the owner of this space
          const isOwner = address.toLowerCase() === loadedSpace.ownerAddress.toLowerCase();
          setIsAuthorized(isOwner);
          
          if (isOwner) {
            setSpace(loadedSpace);
          } else {
            console.error('Unauthorized access: User is not the owner of this space', {
              userAddress: address.toLowerCase(),
              spaceOwner: loadedSpace.ownerAddress.toLowerCase()
            });
            // Try to get user's first space instead
            spaceService.getSpacesByOwner(address).then(userSpaces => {
              if (userSpaces.length > 0) {
                setSpace(userSpaces[0]);
                setIsAuthorized(true);
              } else {
                setIsAuthorized(false);
                if (onBack) {
                  setTimeout(() => onBack(), 1000);
                }
              }
            }).catch(error => {
              console.error('Error loading user spaces:', error);
              setIsAuthorized(false);
              if (onBack) {
                setTimeout(() => onBack(), 1000);
              }
            });
          }
        } else {
          console.error('Space not found:', spaceId);
          // Try to get user's first space instead
          if (address) {
            spaceService.getSpacesByOwner(address).then(userSpaces => {
              if (userSpaces.length > 0) {
                setSpace(userSpaces[0]);
                setIsAuthorized(true);
              } else {
                setIsAuthorized(false);
                if (onBack) {
                  setTimeout(() => onBack(), 1000);
                }
              }
            }).catch(error => {
              console.error('Error loading user spaces:', error);
              setIsAuthorized(false);
              if (onBack) {
                setTimeout(() => onBack(), 1000);
              }
            });
          } else {
            setIsAuthorized(false);
            if (onBack) {
              setTimeout(() => onBack(), 1000);
            }
          }
        }
      }).catch(error => {
        console.error('Error loading space:', error);
        // Try to get user's first space instead
        if (address) {
          spaceService.getSpacesByOwner(address).then(userSpaces => {
            if (userSpaces.length > 0) {
              setSpace(userSpaces[0]);
              setIsAuthorized(true);
            } else {
              setIsAuthorized(false);
              if (onBack) {
                setTimeout(() => onBack(), 1000);
              }
            }
          }).catch(error => {
            console.error('Error loading user spaces:', error);
            setIsAuthorized(false);
            if (onBack) {
              setTimeout(() => onBack(), 1000);
            }
          });
        } else {
          setIsAuthorized(false);
          if (onBack) {
            setTimeout(() => onBack(), 1000);
          }
        }
      });
    } else if (spaceId && !address) {
      // No wallet connected
      setIsAuthorized(false);
      if (onBack) {
        onBack();
      }
    }
  }, [spaceId, address, onBack]);

  // Get quests for this space (filter by projectId matching space name or owner)
  const spaceQuests = useMemo(() => {
    if (!space) return [];
    return quests.filter(q => 
      q.projectName?.toLowerCase() === space.name.toLowerCase() ||
      q.creatorAddress?.toLowerCase() === space.ownerAddress.toLowerCase()
    );
  }, [space, quests]);

  // Fetch real builder stats from database and localStorage
  // Use connected user's address for stats (all quests they've created)
  const builderStats = useBuilderStats(address);

  // Get user's XP for this space (from localStorage or calculate from completions)
  const [spaceXP, setSpaceXP] = useState(0);
  useEffect(() => {
    if (address && space) {
      const key = `space_xp_${space.id}_${address.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setSpaceXP(parseInt(stored, 10));
      } else {
        // Calculate from quest completions
        const userCompletions = spaceQuests.filter(q => 
          q.completedBy?.includes(address.toLowerCase())
        );
        const calculatedXP = userCompletions.reduce((sum, q) => sum + (q.xpReward || 0), 0);
        setSpaceXP(calculatedXP);
      }
    }
  }, [address, space, spaceQuests]);

  const builderDashboardRef = useScrollAnimation();

  // Show loading state
  if (isAuthorized === null) {
    return (
      <div className="builder-dashboard-page">
        <div className="builder-dashboard-loading">
          <div className="builder-spinner"></div>
          <p>Loading space...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized access message
  if (isAuthorized === false || !space) {
    return (
      <div className="builder-dashboard-page">
        <div className="builder-dashboard-loading">
          <p>Unauthorized access. You can only access spaces you own.</p>
          {onBack && (
            <button onClick={onBack} className="builder-back-button" style={{ marginTop: '16px', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleNavClick = (nav: 'dashboard' | 'quests' | 'settings' | 'analytics') => {
    setActiveNav(nav);
    setIsMenuOpen(false); // Close menu on mobile when navigating
  };

  return (
    <div ref={builderDashboardRef} className="builder-dashboard-page">
      {/* Mobile Menu Button */}
      <button 
        className="builder-mobile-menu-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isMenuOpen ? (
            <path d="M18 6L6 18M6 6l12 12"/>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </>
          )}
        </svg>
      </button>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div 
          className="builder-menu-overlay"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div className="builder-dashboard-layout">
        {/* Left Sidebar */}
        <aside className={`builder-sidebar ${isMenuOpen ? 'open' : ''}`}>
          <div className="builder-sidebar-header">
            <img src="/logo.svg" alt="TrustQuests" className="builder-logo-icon" />
            <div className="builder-tag">Builder</div>
          </div>

          {/* Community Card */}
          <div className="builder-sidebar-community-card">
            {space.logo ? (
              <img src={space.logo} alt={space.name} className="builder-sidebar-community-logo" />
            ) : (
              <div className="builder-sidebar-community-logo-placeholder">TRUST</div>
            )}
            <div className="builder-sidebar-community-badge">1</div>
            <div className="builder-sidebar-community-text">Community {space.name}</div>
          </div>

          {/* Navigation */}
          <nav className="builder-sidebar-nav">
            <button 
              className={`builder-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Dashboard</span>
            </button>
            <button 
              className={`builder-nav-item ${activeNav === 'quests' ? 'active' : ''}`}
              onClick={() => handleNavClick('quests')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Quests</span>
            </button>
            <button 
              className={`builder-nav-item ${activeNav === 'guide' ? 'active' : ''}`}
              onClick={() => handleNavClick('guide')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span>Guide</span>
            </button>
            {isPro && (
              <button 
                className={`builder-nav-item ${activeNav === 'analytics' ? 'active' : ''}`}
                onClick={() => handleNavClick('analytics')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span>Analytics</span>
              </button>
            )}
            <button 
              className={`builder-nav-item ${activeNav === 'settings' ? 'active' : ''}`}
              onClick={() => handleNavClick('settings')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
              </svg>
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="builder-main-content">
          {activeNav === 'quests' ? (
            <BuilderQuests 
              spaceId={space?.id}
              onCreateQuest={() => {
                // Navigate to create quest page - you can implement this later
                console.log('Create quest clicked');
              }}
            />
          ) : activeNav === 'guide' ? (
            <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2rem' }}>Quest Creation Guide</h1>
              
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>How to Create a Quest</h2>
                <div style={{ background: 'rgba(26, 31, 53, 0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <ol style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li style={{ marginBottom: '1rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Step 1: Details</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>Enter quest title, difficulty level, description, end date/time, and number of winners. Upload an optional quest image.</p>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Step 2: Actions</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>Add actions that participants must complete. Configure each action with required details (e.g., Twitter account to follow, link to visit).</p>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Step 3: Rewards</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>Set IQ points reward and prize distribution for winners. Specify individual prize amounts for each winner position.</p>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Step 4: Deposit</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>Deposit TRUST tokens to the escrow contract to fund the rewards. The exact amount you enter will be deducted from your wallet.</p>
                    </li>
                    <li style={{ marginBottom: '1rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Step 5: Preview & Publish</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>Review your quest details and publish it on-chain. The quest will be created as an atom and saved to Supabase.</p>
                    </li>
                  </ol>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Quest Rules & Restrictions</h2>
                <div style={{ background: 'rgba(26, 31, 53, 0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Editing Published Quests:</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>You can only edit quests that haven't expired and have no completions. Changes are saved to drafts. You must republish to update on-chain and Supabase.</p>
                    </li>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Free Plan Limits:</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>Free users can create quests with up to 5 winners. Upgrade to Pro for unlimited winners and advanced features.</p>
                    </li>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Deposit Requirements:</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>You must deposit TRUST tokens equal to the total prize amount before publishing. The deposit is locked in escrow until winners are selected.</p>
                    </li>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Grace Period:</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>If a quest expires without winners, you can reclaim your deposit after the grace period (shown on the deposit tab).</p>
                    </li>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Auto-Save:</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>Quest drafts are automatically saved when you move between steps. You can also manually save at any time.</p>
                    </li>
                    <li style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Network Requirements:</strong>
                      <p style={{ marginTop: '0.5rem', marginLeft: '0' }}>You must be connected to the Intuition Network to publish quests and make deposits. The app will prompt you to switch networks if needed.</p>
                    </li>
                  </ul>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Tips for Success</h2>
                <div style={{ background: 'rgba(26, 31, 53, 0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li style={{ marginBottom: '0.75rem' }}>Keep quest descriptions clear and actionable</li>
                    <li style={{ marginBottom: '0.75rem' }}>Set realistic end dates to give participants enough time</li>
                    <li style={{ marginBottom: '0.75rem' }}>Test your actions before publishing to ensure they work correctly</li>
                    <li style={{ marginBottom: '0.75rem' }}>Balance prize amounts to attract participants while staying within budget</li>
                    <li style={{ marginBottom: '0.75rem' }}>Use the preview step to review all details before publishing</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : activeNav === 'analytics' && isPro ? (
            <BuilderAnalytics creatorAddress={address} />
          ) : activeNav === 'settings' && space ? (
            <BuilderSettings 
              space={space}
              onSpaceUpdated={(updatedSpace) => {
                setSpace(updatedSpace);
                setActiveNav('dashboard');
              }}
              onSpaceDeleted={() => {
                // Navigate back to community page when space is deleted
                if (onBack) {
                  onBack();
                }
              }}
            />
          ) : (
            <>
              <h1 className="builder-main-title">Dashboard</h1>

          {/* Stats Grid */}
          <div className="builder-stats-grid">
            <div className="builder-stat-card">
              <div className="builder-stat-icon rocket">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
              </div>
              <div className="builder-stat-content">
                <div className="builder-stat-label">Quests Launched</div>
                <div className="builder-stat-value">
                  {builderStats.isLoading ? '...' : builderStats.questsLaunched}
                </div>
              </div>
            </div>

            <div className="builder-stat-card">
              <div className="builder-stat-icon checkmark">
                <img src="/verified.svg" alt="Verified" width="24" height="24" />
              </div>
              <div className="builder-stat-content">
                <div className="builder-stat-label">Rewards Distributed</div>
                <div className="builder-stat-value">
                  {builderStats.isLoading ? '...' : `${builderStats.rewardsDistributed.toFixed(2)} TRUST`}
                </div>
              </div>
            </div>

            <div className="builder-stat-card">
              <div className="builder-stat-icon trophy">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                </svg>
              </div>
              <div className="builder-stat-content">
                <div className="builder-stat-label">Total Completions</div>
                <div className="builder-stat-value">
                  {builderStats.isLoading ? '...' : builderStats.totalCompletions}
                </div>
              </div>
            </div>

            <div className="builder-stat-card">
              <div className="builder-stat-icon chart">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <div className="builder-stat-content">
                <div className="builder-stat-label">Builder Rank</div>
                <div className="builder-stat-value">-</div>
              </div>
            </div>
          </div>

          {/* Community Stats Section */}
          <div className="builder-section">
            <h2 className="builder-section-title">Community Stats</h2>
            <div className="builder-community-stats-grid">
              <div className="builder-community-card">
                {space.logo ? (
                  <img src={space.logo} alt={space.name} className="builder-community-logo" />
                ) : (
                  <div className="builder-community-logo-placeholder">TRUST</div>
                )}
                <div className="builder-community-badge">1</div>
                <div className="builder-community-name">{space.name}</div>
                <div className="builder-community-xp">XP {spaceXP}/100</div>
              </div>

              <div className="builder-staked-card">
                <div className="builder-staked-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <div className="builder-staked-info">
                  <div className="builder-staked-label">Staked</div>
                  <div className="builder-staked-value">0 TRUST</div>
                </div>
                <button className="builder-staked-button">Stake</button>
              </div>
            </div>
          </div>

          {/* Builder Rewards Section */}
          <div className="builder-section">
            <div className="builder-rewards-header">
              <div className="builder-rewards-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                </svg>
              </div>
              <h2 className="builder-section-title">Builder Rewards</h2>
            </div>
            <div className="builder-rewards-message">
              Builder Rewards are coming soon
            </div>
          </div>
            </>
          )}
        </main>
      </div>

    </div>
  );
}