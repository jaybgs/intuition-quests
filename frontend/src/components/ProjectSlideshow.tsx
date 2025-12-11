import { useState, useEffect, useCallback, startTransition } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { showToast } from './Toast';
import { spaceService } from '../services/spaceService';
import { questServiceSupabase } from '../services/questServiceSupabase';
import { DiscoverPageSkeleton, SpaceCardSkeleton, DAppCardSkeleton } from './Skeleton';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import type { Space } from '../types';
import type { Quest } from '../types';
import './ProjectSlideshow.css';

interface Project {
  id: string;
  title: string;
  description: string;
  image?: string;
  gradientColors: string[];
  questCount?: number;
  isHot?: boolean;
  isTrending?: boolean;
}

// Mock projects data - replace with actual data
const projects: Project[] = [
  {
    id: '1',
    title: 'Project Alpha',
    description: 'Complete tasks to earn rewards and unlock exclusive features. Join thousands of users earning daily!',
    gradientColors: ['#2563eb', '#2563eb'],
    questCount: 12,
    isHot: true,
  },
  {
    id: '2',
    title: 'Project Beta',
    description: 'Join the community and participate in exciting challenges. New quests added weekly!',
    gradientColors: ['#10b981', '#3b82f6'],
    questCount: 8,
    isTrending: true,
  },
  {
    id: '3',
    title: 'Project Gamma',
    description: 'Explore new opportunities and grow your portfolio. Start your journey today!',
    gradientColors: ['#f59e0b', '#ef4444'],
    questCount: 15,
  },
];

interface ProjectSlideshowProps {
  onQuestClick?: (questId: string) => void;
  onCreateSpace?: () => void;
  onSpaceClick?: (space: Space) => void;
  onSeeMoreSpaces?: () => void;
}

export function ProjectSlideshow({ onQuestClick, onCreateSpace, onSpaceClick, onSeeMoreSpaces }: ProjectSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [sortByVerified, setSortByVerified] = useState(false);
  const [sortByFollowing, setSortByFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpacesLoading, setIsSpacesLoading] = useState(true);
  const [isDAppsLoading, setIsDAppsLoading] = useState(true);
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
  const { address, status } = useAccount();
  const queryClient = useQueryClient();

  // Page loading skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // DApps loading (brief delay for smooth transition)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDAppsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projects.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Load spaces
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    
    const loadSpaces = async () => {
      // Only update state if component is still mounted and not during render
      if (!isMounted) return;
      
      try {
        setIsSpacesLoading(true);
        // spaceService.getAllSpaces() is now async (Supabase)
        const allSpaces = await spaceService.getAllSpaces();
        // Use startTransition to mark this as a non-urgent update
        // This prevents the "setState during render" warning
        if (isMounted) {
        startTransition(() => {
          if (isMounted) {
            setSpaces(allSpaces);
            setIsSpacesLoading(false);
          }
        });
        }
      } catch (error) {
        console.error('Error loading spaces:', error);
        // Fallback to empty array on error
        if (isMounted) {
          startTransition(() => {
            if (isMounted) {
            setSpaces([]);
            setIsSpacesLoading(false);
            }
          });
        }
      }
    };
    
    // Delay initial load to ensure we're not in render phase
    const initialLoadTimer = setTimeout(() => {
      if (isMounted) {
      loadSpaces();
      }
    }, 100);
    
    // Listen for space creation events to refresh immediately
    const handleSpaceCreated = () => {
      // Use setTimeout to ensure we're not in render phase
      setTimeout(() => {
        if (isMounted) {
      loadSpaces();
        }
      }, 0);
    };
    
    // Listen for quest published events to refresh quest counts
    const handleQuestPublished = () => {
      // Use setTimeout to ensure we're not in render phase
      setTimeout(() => {
        if (isMounted) {
      startTransition(() => {
        if (isMounted) {
          setSpaces(prev => [...prev]);
        }
      });
        }
      }, 0);
    };
    
    // Add event listeners after a small delay to avoid render phase issues
    setTimeout(() => {
      if (isMounted) {
    window.addEventListener('spaceCreated', handleSpaceCreated);
    window.addEventListener('questPublished', handleQuestPublished);
      }
    }, 0);
    
    // Reload spaces periodically in case they change
    // Start interval after initial load
    setTimeout(() => {
      if (isMounted) {
        intervalId = setInterval(() => {
          if (isMounted) {
            loadSpaces();
          }
        }, 3000);
      }
    }, 1000);
    
    return () => {
      isMounted = false;
      clearTimeout(initialLoadTimer);
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener('spaceCreated', handleSpaceCreated);
      window.removeEventListener('questPublished', handleQuestPublished);
    };
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % projects.length);
  };

  const handleStartQuest = () => {
    // Check primarily for address - more reliable than isConnected
    if (!address) {
      showToast('Please connect your wallet to start quests', 'warning');
      return;
    }
    showToast('Redirecting to quests...', 'info');
    // Navigate to quests page
    window.location.hash = '#quests';
  };

  const currentProject = projects[currentIndex];

  // Check if user is following a space
  const isFollowingSpace = (spaceId: string): boolean => {
    if (!address) return false;
    const following = JSON.parse(localStorage.getItem(`user_following_${address}`) || '[]');
    return following.includes(spaceId);
  };

  // Sort spaces based on active sort options
  const sortedSpaces = [...spaces].sort((a, b) => {
    const aVerified = a.userType === 'project';
    const bVerified = b.userType === 'project';
    const aFollowers = parseInt(localStorage.getItem(`space_followers_${a.id}`) || '0');
    const bFollowers = parseInt(localStorage.getItem(`space_followers_${b.id}`) || '0');
    const aFollowing = isFollowingSpace(a.id);
    const bFollowing = isFollowingSpace(b.id);
    
    // Priority 1: If sorting by verified, verified spaces come first
    if (sortByVerified) {
      if (aVerified && !bVerified) return -1;
      if (!aVerified && bVerified) return 1;
    }
    
    // Priority 2: If sorting by following, followed spaces come first
    if (sortByFollowing) {
      if (aFollowing && !bFollowing) return -1;
      if (!aFollowing && bFollowing) return 1;
    }
    
    // Default: maintain original order
    return 0;
  });

  // Limit spaces based on screen size (8 desktop, 5 mobile)
  const maxSpacesDesktop = 8;
  const maxSpacesMobile = 5;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxSpaces = isMobile ? maxSpacesMobile : maxSpacesDesktop;
  const displayedSpaces = sortedSpaces.slice(0, maxSpaces);
  const hasMoreSpaces = sortedSpaces.length > maxSpaces;

  // Fetch active quest counts for all spaces from Supabase
  useEffect(() => {
    const fetchQuestCounts = async () => {
      if (spaces.length === 0) return;
      
      try {
        const counts: Record<string, number> = {};
        
        // Fetch active quests for each space from Supabase
        await Promise.all(
          spaces.map(async (space) => {
            try {
              const activeQuests = await questServiceSupabase.getAllQuests({
                spaceId: space.id,
                status: 'active'
              });
              counts[space.id] = activeQuests.length;
            } catch (error) {
              console.error(`Error fetching quest count for space ${space.id}:`, error);
              counts[space.id] = 0;
            }
          })
        );
        
        setQuestCounts(counts);
      } catch (error) {
        console.error('Error fetching quest counts:', error);
      }
    };
    
    fetchQuestCounts();
  }, [spaces]);
  
  // Get quest count for a space (from state)
  const getQuestCount = (spaceId: string): number => {
    return questCounts[spaceId] || 0;
  };

  // Get follower count for a space (mock for now)
  const getFollowerCount = (spaceId: string): number => {
    return parseInt(localStorage.getItem(`space_followers_${spaceId}`) || '0');
  };

  // Get token status for a space (mock for now)
  const getTokenStatus = (spaceId: string): { status: string; symbol?: string } => {
    const status = localStorage.getItem(`space_token_status_${spaceId}`) || 'Undisclosed';
    const symbol = localStorage.getItem(`space_token_symbol_${spaceId}`) || undefined;
    return { status, symbol };
  };

  const slideshowRef = useScrollAnimation();
  const spacesRef = useScrollAnimation();

  if (isLoading) {
    return <DiscoverPageSkeleton />;
  }

  return (
    <div className="discover-earn-container">
      <h1 className="welcome-text">Welcome to TrustQuests</h1>
      <div className="slideshow-glass">
          <button 
            className="slideshow-nav slideshow-prev" 
            onClick={goToPrevious} 
            aria-label="Previous slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="slideshow-content">
            <div 
              className="slideshow-image"
              style={{
                background: `linear-gradient(135deg, ${currentProject.gradientColors[0]} 0%, ${currentProject.gradientColors[1]} 100%)`
              }}
            >
              <div className="slideshow-image-placeholder">
                {currentProject.title.charAt(0)}
              </div>
              {currentProject.isHot && (
                <div className="slideshow-badge slideshow-badge-hot">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.6 1.5-3.5 3.5-5.5z"/>
                  </svg>
                  Hot
                </div>
              )}
              {currentProject.isTrending && (
                <div className="slideshow-badge slideshow-badge-trending">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                  Trending
                </div>
              )}
            </div>
            <div className="slideshow-info">
              <div className="slideshow-header">
                <h2 className="slideshow-title">{currentProject.title}</h2>
                {currentProject.questCount && (
                  <div className="slideshow-quest-count">
                    <img src="/verified.svg" alt="Verified" width="16" height="16" />
                    {currentProject.questCount} Quests
                  </div>
                )}
              </div>
              <p className="slideshow-description">{currentProject.description}</p>
              <button 
                className="slideshow-start-button"
                onClick={handleStartQuest}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="5 12 10 17 20 7"/>
                </svg>
                Start Quest
              </button>
            </div>
          </div>
          <div className="slideshow-indicators">
            {projects.map((_, index) => (
              <button
                key={index}
                className={`slideshow-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          <button 
            className="slideshow-nav slideshow-next" 
            onClick={goToNext} 
            aria-label="Next slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

      {/* Spaces Grid Section */}
      <div ref={spacesRef} className="spaces-section">
        <div className="spaces-header">
          <h2 className="spaces-title">Spaces</h2>
          <div className="spaces-filters">
            <button
              className={`spaces-filter-button ${sortByVerified ? 'active' : ''}`}
              onClick={() => setSortByVerified(!sortByVerified)}
            >
              <img src="/verified.svg" alt="Verified" width="16" height="16" />
              Verified
            </button>
            <button
              className={`spaces-filter-button ${sortByFollowing ? 'active' : ''}`}
              onClick={() => setSortByFollowing(!sortByFollowing)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <path d="M20 8v6M23 11h-6"/>
              </svg>
              Following
            </button>
          </div>
          <button
            className="create-space-button"
            onClick={() => {
              localStorage.setItem('spaceBuilderSource', 'discover');
              onCreateSpace?.();
            }}
          >
            Create Space
          </button>
        </div>

        <div className="spaces-grid">
          {isSpacesLoading ? (
            <>
              {[...Array(maxSpaces)].map((_, index) => (
                <SpaceCardSkeleton key={`skeleton-${index}`} />
              ))}
            </>
          ) : displayedSpaces.length === 0 ? (
            <div className="spaces-empty">
              <p>No spaces found. Create your first space to get started!</p>
            </div>
          ) : (
            displayedSpaces.map((space) => {
              const questCount = getQuestCount(space.id);
              const followerCount = getFollowerCount(space.id);
              const tokenInfo = getTokenStatus(space.id);
              
              return (
                <div
                  key={space.id}
                  className="space-card"
                  data-space-id={space.id}
                  data-space-name={space.name}
                  onClick={() => onSpaceClick?.(space)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSpaceClick?.(space);
                    }
                  }}
                >
                  <div className="space-card-header">
                    <div className="space-logo">
                      {space.logo ? (
                        <img src={space.logo} alt={space.name} />
                      ) : (
                        <div className="space-logo-placeholder">
                          {space.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="space-verified-badge">
                      <img src="/verified.svg" alt="Verified" width="16" height="16" />
                    </div>
                  </div>
                  <div className="space-card-content">
                    <h3 className="space-name">{space.name}</h3>
                    <div className="space-stats">
                      <div className="space-followers">
                        {followerCount > 0 ? `${(followerCount / 1000).toFixed(1)}K+` : '0'} Followers
                      </div>
                      <div className={`space-quests ${questCount > 0 ? 'active' : ''}`}>
                        {questCount} {questCount === 1 ? 'active quest' : 'active quests'}
                      </div>
                    </div>
                    <div className="space-token">
                      {tokenInfo.symbol ? (
                        <div className="space-token-with-symbol">
                          <span className="space-token-symbol">{tokenInfo.symbol}</span>
                        </div>
                      ) : tokenInfo.status === 'TGE Upcoming' ? (
                        <div className="space-token-upcoming">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          TGE Upcoming
                        </div>
                      ) : (
                        <span className="space-token-status">{tokenInfo.status}</span>
                      )}
                    </div>
                    {space.userType === 'project' && space.projectType && (
                      <div className="space-project-type">
                        {space.projectType === 'other' && space.projectTypeOther
                          ? space.projectTypeOther
                          : space.projectType === 'defi'
                          ? 'DeFi'
                          : space.projectType === 'infofi'
                          ? 'InfoFi'
                          : 'Undisclosed'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {hasMoreSpaces && (
          <div className="spaces-see-more">
            <button
              className="spaces-see-more-button"
              onClick={() => onSeeMoreSpaces?.()}
            >
              See More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Ecosystem dApps Section */}
      <div className="ecosystem-dapps-section">
        <div className="ecosystem-dapps-header">
          <h2 className="ecosystem-dapps-title">Ecosystem dApps</h2>
        </div>

        <div className="ecosystem-dapps-grid">
          {isDAppsLoading ? (
            <>
              {[...Array(6)].map((_, index) => (
                <DAppCardSkeleton key={`dapp-skeleton-${index}`} />
              ))}
            </>
          ) : (
            <>
          <a
            href="https://portal.intuition.systems/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <img src="/intuition-portal-logo.svg" alt="Intuition Portal" />
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">Intuition Portal</h3>
              <p className="ecosystem-dapp-description">
                Access the Intuition network portal to explore identities, atoms, and the decentralized knowledge graph.
              </p>
            </div>
          </a>

          <a
            href="https://tns.intuition.box/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <img src="/tns logo.svg" alt="Trust Name Services" />
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">Trust Name Services</h3>
              <p className="ecosystem-dapp-description">
                Decentralized naming service for the Intuition network. Register and manage human-readable names for your identities and addresses.
              </p>
            </div>
          </a>

          <a
            href="https://inturank.intuition.box/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <img src="/inturank-logo.svg" alt="IntuRank" />
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">IntuRank</h3>
              <p className="ecosystem-dapp-description">
                Rank and evaluate projects within the Intuition ecosystem. Get insights and metrics to make informed decisions about network projects.
              </p>
            </div>
          </a>

          <a
            href="https://tribememe.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <img src="/tribememe-logo.svg" alt="Tribememe" />
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">Tribememe</h3>
              <p className="ecosystem-dapp-description">
                A decentralized social platform for creating, sharing, and engaging with memes. Build your community and connect with like-minded creators.
              </p>
            </div>
          </a>

          <a
            href="https://intuitionbets.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <img src="/intuition-bets.svg" alt="IntuitionBets" />
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">IntuitionBets</h3>
              <p className="ecosystem-dapp-description">
                Decentralized betting platform on the Intuition network. Place bets on events, predictions, and outcomes with transparent, on-chain resolution.
              </p>
            </div>
          </a>

          <a
            href="https://oraclelend.intuition.box/"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <img src="/oracle-lend-logo.svg" alt="Oracle Lend" />
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">Oracle Lend</h3>
              <p className="ecosystem-dapp-description">
                Decentralized lending protocol on the Intuition network. Borrow and lend assets with transparent rates and oracle-powered price feeds.
              </p>
            </div>
          </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}