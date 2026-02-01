import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { spaceService } from '../services/spaceService';
import type { Space } from '../types';
import { useQuests } from '../hooks/useQuests';
import { useAdmin } from '../hooks/useAdmin';
import { useBuilderStats } from '../hooks/useBuilderStats';

import { useSubscription } from '../hooks/useSubscription';
import { BuilderSettings } from './BuilderSettings';
import { BuilderQuests } from './BuilderQuests';
import { BuilderAnalytics } from './BuilderAnalytics';
import { Reveal } from './Reveal';
import { Dock, DockIcon } from './VerticalDock';
import BlurText from './BlurText';
import { MobileDock } from './MobileDock';
import './BuilderDashboard.css';

interface BuilderDashboardProps {
  spaceId: string;
  onBack?: () => void;
}

export function BuilderDashboard({ spaceId, onBack }: BuilderDashboardProps) {
  console.log('🔧 BuilderDashboard mounted with spaceId:', spaceId);
  const { address } = useAccount();
  const { isAuthenticated: isAdminLoggedIn, isAdmin: hasAdminRole } = useAdmin();
  console.log('🔧 BuilderDashboard user state - address:', address, 'isAdminLoggedIn:', isAdminLoggedIn, 'hasAdminRole:', hasAdminRole);
  const [space, setSpace] = useState<Space | null>(null);
  const [activeNav, setActiveNav] = useState<'dashboard' | 'quests' | 'guide' | 'settings' | 'analytics'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { quests } = useQuests();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const { isPro } = useSubscription();

  useEffect(() => {
    console.log('🔧 BuilderDashboard useEffect triggered with spaceId:', spaceId);
    // Handle empty string or null spaceId
    if (!spaceId || spaceId.trim() === '') {
      console.log('🔧 No spaceId provided, trying to get user spaces');
      // If no spaceId provided, try to get user's first space
      // For admin users, they can access spaces even without a wallet connected
      if (address || isAdminLoggedIn || hasAdminRole) {
        const ownerAddress = address || 'admin'; // Use a placeholder for admin access
        spaceService.getSpacesByOwner(ownerAddress).then(userSpaces => {
          console.log('🔧 Found user spaces:', userSpaces.length);
          if (userSpaces.length > 0) {
            // Use the first space
            const firstSpace = userSpaces[0];
            console.log('🔧 Using first user space:', firstSpace.name);
            setSpace(firstSpace);
            setIsAuthorized(true);
          } else {
            console.log('🔧 No user spaces found');
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
        console.log('🔧 No address available and not logged in as admin');
        setIsAuthorized(false);
        if (onBack) {
          setTimeout(() => onBack(), 1000);
        }
      }
      return;
    }

    // Handle specific spaceId - check authorization
    // Admin users can access any space even without a wallet connected
    if (spaceId && (address || isAdminLoggedIn || hasAdminRole)) {
      spaceService.getSpaceById(spaceId).then(loadedSpace => {
        if (loadedSpace) {
          // Check if the space has ownerAddress
          if (!loadedSpace.ownerAddress) {
            console.error('Space does not have ownerAddress:', loadedSpace);
            // For admin users, they can still access the space even if it doesn't have an ownerAddress
            if (isAdminLoggedIn || hasAdminRole) {
              console.log('✅ Admin access granted to space without ownerAddress');
              setSpace(loadedSpace);
              setIsAuthorized(true);
              return;
            }
            // Try to get user's first space instead (for non-admin users)
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
            return;
          }

          // Check authorization: Admin users have access to ALL spaces, owners have access to their own spaces
          const isOwner = address ? address.toLowerCase() === loadedSpace.ownerAddress.toLowerCase() : false;
          const isAuthorized = (isAdminLoggedIn || hasAdminRole) || isOwner; // Note: Admin check comes first for clarity

          console.log('🔍 BuilderDashboard Authorization Check:', {
            spaceId,
            userAddress: address?.toLowerCase(),
            spaceOwner: loadedSpace.ownerAddress?.toLowerCase(),
            isOwner,
            isAdminLoggedIn,
            hasAdminRole,
            isAuthorized,
            accessReason: (isAdminLoggedIn || hasAdminRole) ? 'ADMIN_ACCESS' : isOwner ? 'OWNER_ACCESS' : 'NO_ACCESS'
          });

          if (isAuthorized) {
            console.log('✅ Authorization granted, setting space and authorized state');
            setSpace(loadedSpace);
            setIsAuthorized(true);
          } else {
            console.log('❌ Authorization denied, checking if admin login needed');
            // User is not authorized - check if they might be an admin who needs to log in
            console.log('❌ Unauthorized access attempt:', {
              userAddress: address?.toLowerCase(),
              spaceOwner: loadedSpace.ownerAddress?.toLowerCase(),
              isAdminLoggedIn,
              hasAdminRole,
              reason: 'Not owner and not admin'
            });

            // Admin access is only available via keyboard shortcut (Ctrl+Shift+A) on PC devices
            console.log('🔒 Admin access denied - only available via Ctrl+Shift+A on PC devices');

            // Fallback: try to redirect to user's own space
            console.log('🔄 Trying to redirect to user\'s own space');
            spaceService.getSpacesByOwner(address).then(userSpaces => {
              if (userSpaces.length > 0) {
                console.log('🔄 Found user spaces, using first one:', userSpaces[0].name);
                setSpace(userSpaces[0]);
                setIsAuthorized(true);
              } else {
                console.log('❌ No user spaces found, showing unauthorized');
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

          if (isAuthorized) {
            console.log('✅ Access granted to builder dashboard');
            setSpace(loadedSpace);
            setIsAuthorized(true);
          } else {
            // User is not authorized - they need to be either the owner or logged in as admin
            console.log('❌ Access denied to builder dashboard:', {
              userAddress: address.toLowerCase(),
              spaceOwner: loadedSpace.ownerAddress.toLowerCase(),
              isAdminLoggedIn,
              hasAdminRole,
              reason: 'Not owner and not logged in as admin'
            });

            // Admin access is only available via keyboard shortcut (Ctrl+Shift+A) on PC devices
            console.log('🔒 Admin access denied - only available via Ctrl+Shift+A on PC devices');

            // Fallback: try to redirect to user's own space
            spaceService.getSpacesByOwner(address).then(userSpaces => {
              if (userSpaces.length > 0) {
                console.log('🔄 Redirecting to user\'s own space:', userSpaces[0].id);
                setSpace(userSpaces[0]);
                setIsAuthorized(true);
              } else {
                console.log('❌ No spaces found for user, showing unauthorized message');
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
  }, [spaceId, address, onBack, isAdminLoggedIn]);

  // Re-check authorization when admin status changes
  useEffect(() => {
    if (spaceId && address && space && isAuthorized === false) {
      const isOwner = address.toLowerCase() === space.ownerAddress.toLowerCase();
      const newIsAuthorized = isOwner || isAdminLoggedIn || hasAdminRole;
      if (newIsAuthorized) {
        setIsAuthorized(true);
      }
    }
  }, [isAdminLoggedIn, spaceId, address, space, isAuthorized]);

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
        const calculatedXP = userCompletions.reduce((sum, q) => sum + (q.xpReward || q.iqPoints || 0), 0);
        setSpaceXP(calculatedXP);
      }
    }
  }, [address, space, spaceQuests]);



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
          <p>Unauthorized access. You can only access spaces you own or have admin privileges for.</p>
          {onBack && (
            <button onClick={onBack} className="builder-back-button" style={{ marginTop: '16px', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleNavClick = (nav: 'dashboard' | 'quests' | 'guide' | 'settings' | 'analytics') => {
    setActiveNav(nav);
    setIsMenuOpen(false); // Close menu on mobile when navigating
  };

  return (
    <div className="builder-dashboard-page">
      {/* Mobile Menu Button */}


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
          {/* Navigation */}
          <nav className="builder-sidebar-nav">
            <Dock>
              <DockIcon>
                <button
                  className={`builder-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
                  onClick={() => handleNavClick('dashboard')}
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: '0px' }}
                >
                  <span style={{ fontSize: '20px' }}>🏠</span>
                  <span style={{ marginLeft: '-100px' }}>Dashboard</span>
                </button>
              </DockIcon>
              <DockIcon>
                <button
                  className={`builder-nav-item ${activeNav === 'quests' ? 'active' : ''}`}
                  onClick={() => handleNavClick('quests')}
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: '0px' }}
                >
                  <span style={{ fontSize: '20px' }}>⚔️</span>
                  <span style={{ marginLeft: '-100px' }}>Quests</span>
                </button>
              </DockIcon>
              <DockIcon>
                <button
                  className={`builder-nav-item ${activeNav === 'guide' ? 'active' : ''}`}
                  onClick={() => handleNavClick('guide')}
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: '0px' }}
                >
                  <span style={{ fontSize: '20px' }}>📚</span>
                  <span style={{ marginLeft: '-100px' }}>Guide</span>
                </button>
              </DockIcon>
              {isPro && (
                <DockIcon>
                  <button
                    className={`builder-nav-item ${activeNav === 'analytics' ? 'active' : ''}`}
                    onClick={() => handleNavClick('analytics')}
                    style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: '0px' }}
                  >
                    <span style={{ fontSize: '20px' }}>📊</span>
                    <span style={{ marginLeft: '-100px' }}>Analytics</span>
                  </button>
                </DockIcon>
              )}
              <DockIcon>
                <button
                  className={`builder-nav-item ${activeNav === 'settings' ? 'active' : ''}`}
                  onClick={() => handleNavClick('settings')}
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: '0px' }}
                >
                  <span style={{ fontSize: '20px' }}>⚙️</span>
                  <span style={{ marginLeft: '-100px' }}>Settings</span>
                </button>
              </DockIcon>
            </Dock>
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
              <div style={{ marginBottom: '0.5rem' }}>
                <BlurText
                  text="Space Dashboard"
                  delay={150}
                  animateBy="words"
                  direction="top"
                  className="builder-main-title"
                />
              </div>

              {/* Stats Grid */}{/* Stats Grid */}
              <div className="builder-stats-grid" style={{ marginTop: '-10px' }}>
                <Reveal delay={0}>
                  <div className="builder-stat-card">
                    <div className="builder-stat-icon rocket">
                      <span style={{ fontSize: '24px' }}>🚀</span>
                    </div>
                    <div className="builder-stat-content">
                      <div className="builder-stat-label">Quests Launched</div>
                      <div className="builder-stat-value">
                        {builderStats.isLoading ? '...' : builderStats.questsLaunched}
                      </div>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={100}>
                  <div className="builder-stat-card">
                    <div className="builder-stat-icon checkmark">
                      <img src="/intuition-logo.png" alt="Intuition" style={{ width: '54px', height: '54px' }} />
                    </div>
                    <div className="builder-stat-content">
                      <div className="builder-stat-label">Rewards Distributed</div>
                      <div className="builder-stat-value">
                        {builderStats.isLoading ? '...' : `${builderStats.rewardsDistributed.toFixed(2)} TRUST`}
                      </div>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={200}>
                  <div className="builder-stat-card">
                    <div className="builder-stat-icon trophy">
                      <span style={{ fontSize: '24px' }}>🏆</span>
                    </div>
                    <div className="builder-stat-content">
                      <div className="builder-stat-label">Total Completions</div>
                      <div className="builder-stat-value">
                        {builderStats.isLoading ? '...' : builderStats.totalCompletions}
                      </div>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={300}>
                  <div className="builder-stat-card">
                    <div className="builder-stat-icon chart">
                      <span style={{ fontSize: '24px' }}>📈</span>
                    </div>
                    <div className="builder-stat-content">
                      <div className="builder-stat-label">Builder Rank</div>
                      <div className="builder-stat-value">-</div>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Community Stats Section */}
              <div className="builder-section">
                <h2 className="builder-section-title">Community Stats</h2>
                <div className="builder-community-stats-grid">
                  <Reveal delay={400} width="100%">
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
                  </Reveal>

                  <Reveal delay={500} width="100%">
                    <div className="builder-staked-card">
                      <div className="builder-staked-icon">
                        <img src="/intuition-logo.png" alt="Intuition" style={{ width: '72px', height: '72px' }} />
                      </div>
                      <div className="builder-staked-info">
                        <div className="builder-staked-label">Staked</div>
                        <div className="builder-staked-value">0 TRUST</div>
                      </div>
                      <button className="builder-staked-button">Stake</button>
                    </div>
                  </Reveal>
                </div>
              </div>

              {/* Builder Rewards Section */}
              <Reveal delay={600} width="100%">
                <div className="builder-section">
                  <div className="builder-rewards-header">
                    <div className="builder-rewards-icon">
                      <span style={{ fontSize: '24px' }}>🎁</span>
                    </div>
                    <h2 className="builder-section-title">Builder Rewards</h2>
                  </div>
                  <div className="builder-rewards-message">
                    Builder Rewards are coming soon
                  </div>
                </div>
              </Reveal>
            </>
          )}
        </main>
      </div>

      <div className="builder-mobile-dock-wrapper">
        <MobileDock items={[
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <span style={{ fontSize: '24px' }}>🏠</span>,
            onClick: () => handleNavClick('dashboard'),
            isActive: activeNav === 'dashboard'
          },
          {
            id: 'quests',
            label: 'Quests',
            icon: <span style={{ fontSize: '24px' }}>⚔️</span>,
            onClick: () => handleNavClick('quests'),
            isActive: activeNav === 'quests'
          },
          {
            id: 'guide',
            label: 'Guide',
            icon: <span style={{ fontSize: '24px' }}>📚</span>,
            onClick: () => handleNavClick('guide'),
            isActive: activeNav === 'guide'
          },
          ...(isPro ? [{
            id: 'analytics',
            label: 'Analytics',
            icon: <span style={{ fontSize: '24px' }}>📈</span>,
            onClick: () => handleNavClick('analytics'),
            isActive: activeNav === 'analytics'
          }] : []),
          {
            id: 'settings',
            label: 'Settings',
            icon: <span style={{ fontSize: '24px' }}>⚙️</span>,
            onClick: () => handleNavClick('settings'),
            isActive: activeNav === 'settings'
          }
        ]} />
      </div>

    </div>
  );
}