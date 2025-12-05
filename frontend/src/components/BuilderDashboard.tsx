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
  const [activeNav, setActiveNav] = useState<'dashboard' | 'quests' | 'settings' | 'analytics'>('dashboard');
  const { quests } = useQuests();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const { isPro } = useSubscription();

  useEffect(() => {
    if (spaceId && address) {
      spaceService.getSpaceById(spaceId).then(loadedSpace => {
        if (loadedSpace) {
          // Check if the connected wallet is the owner of this space
          const isOwner = address.toLowerCase() === loadedSpace.ownerAddress.toLowerCase();
          setIsAuthorized(isOwner);
          
          if (isOwner) {
            setSpace(loadedSpace);
          } else {
            console.error('Unauthorized access: User is not the owner of this space');
            // Redirect back if not authorized
            if (onBack) {
              onBack();
            }
          }
        } else {
          console.error('Space not found:', spaceId);
          setIsAuthorized(false);
        }
      }).catch(error => {
        console.error('Error loading space:', error);
        setIsAuthorized(false);
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

  return (
    <div ref={builderDashboardRef} className="builder-dashboard-page">
      <div className="builder-dashboard-layout">
        {/* Left Sidebar */}
        <aside className="builder-sidebar">
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
              onClick={() => setActiveNav('dashboard')}
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
              onClick={() => setActiveNav('quests')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Quests</span>
            </button>
            {isPro && (
              <button 
                className={`builder-nav-item ${activeNav === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveNav('analytics')}
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
              onClick={() => setActiveNav('settings')}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
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