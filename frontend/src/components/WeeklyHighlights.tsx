import { useState, useEffect, useCallback, startTransition } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { showToast } from './Toast';
import { spaceService } from '../services/spaceService';
import { questServiceSupabase } from '../services/questServiceSupabase';
import { DiscoverPageSkeleton, SpaceCardSkeleton, DAppCardSkeleton } from './Skeleton';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { highlightsServiceSupabase } from '../services/highlightsServiceSupabase';
import { isPCDevice } from '../utils/deviceDetection';
import type { Space } from '../types';
import type { Quest } from '../types';
import './WeeklyHighlights.css';

interface Project {
  id: string;
  title: string;
  description: string;
  image?: string;
  gradientColors: string[];
  questCount?: number;
  isHot?: boolean;
  isTrending?: boolean;
  questLink?: string;
}

// Default projects data
const defaultProjects: Project[] = [
  {
    id: '1',
    title: 'Project Alpha',
    description: 'Complete tasks to earn rewards and unlock exclusive features. Join thousands of users earning daily!',
    gradientColors: ['#2563eb', '#2563eb'],
    questCount: 12,
    isHot: true,
    questLink: '#quests',
  },
  {
    id: '2',
    title: 'Project Beta',
    description: 'Join the community and participate in exciting challenges. New quests added weekly!',
    gradientColors: ['#10b981', '#3b82f6'],
    questCount: 8,
    isTrending: true,
    questLink: '#quests',
  },
  {
    id: '3',
    title: 'Project Gamma',
    description: 'Explore new opportunities and grow your portfolio. Start your journey today!',
    gradientColors: ['#f59e0b', '#ef4444'],
    questCount: 15,
    questLink: '#quests',
  },
];

interface WeeklyHighlightsProps {
  onQuestClick?: (questId: string) => void;
  onCreateSpace?: () => void;
  onSpaceClick?: (space: Space) => void;
  onSeeMoreSpaces?: () => void;
  isAdmin?: boolean;
  onEditHighlights?: () => void;
}

export function WeeklyHighlights({ onQuestClick, onCreateSpace, onSpaceClick, onSeeMoreSpaces, isAdmin, onEditHighlights }: WeeklyHighlightsProps) {
  // State for highlights loaded from Supabase
  const [projects, setProjects] = useState<Project[]>([]);
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

  // Load highlights from Supabase
  useEffect(() => {
    const loadHighlights = async () => {
      try {
        const highlights = await highlightsServiceSupabase.getAllHighlights();
        setProjects(highlights);
      } catch (error) {
        console.error('Error loading highlights:', error);
        // Fallback to default highlights if Supabase fails
        setProjects([
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
        ]);
      }
    };

    loadHighlights();
  }, []);

  // Add smooth slide transition effect
  const [isAnimating, setIsAnimating] = useState(false);

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return; // Prevent rapid clicking and same slide

    setIsAnimating(true);

    // Get all slide elements
    const slides = document.querySelectorAll('.slideshow-slide');
    const currentSlide = slides[currentIndex];
    const nextSlide = slides[index];

    if (currentSlide && nextSlide) {
      // Determine direction
      const direction = index > currentIndex ? 1 : -1;

      // Add leaving animation to current slide
      currentSlide.classList.add('leaving-left');
      currentSlide.classList.remove('active');

      // Add entering animation to next slide
      nextSlide.classList.add('entering-right');
      nextSlide.classList.add('active');


      // Update current index after animation starts
      setTimeout(() => {
        setCurrentIndex(index);

        // Clean up classes
        currentSlide.classList.remove('leaving-left', 'active');
        nextSlide.classList.remove('entering-right');

        setIsAnimating(false);
      }, 800); // Match CSS transition duration
    } else {
      setCurrentIndex(index);
      setIsAnimating(false);
    }
  };

  const goToPrevious = () => {
    const newIndex = (currentIndex - 1 + projects.length) % projects.length;
    goToSlide(newIndex);
  };

  const goToNext = () => {
    const newIndex = (currentIndex + 1) % projects.length;
    goToSlide(newIndex);
  };

  // Auto-advance slides with animation
  useEffect(() => {
    if (projects.length === 0 || isAnimating) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % projects.length;
      goToSlide(nextIndex);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [projects, isAnimating, currentIndex]);

  // Load spaces from Supabase only
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    let hasLoadedOnce = false;
    
    const loadSpaces = async (showLoading = false) => {
      // Only update state if component is still mounted and not during render
      if (!isMounted) return;
      
      try {
        if (showLoading && !hasLoadedOnce) {
        setIsSpacesLoading(true);
        }
        // spaceService.getAllSpaces() uses Supabase only
        const allSpaces = await spaceService.getAllSpaces();
        // Use startTransition to mark this as a non-urgent update
        // This prevents the "setState during render" warning
        if (isMounted) {
        startTransition(() => {
          if (isMounted) {
            setSpaces(allSpaces);
              if (showLoading && !hasLoadedOnce) {
            setIsSpacesLoading(false);
                hasLoadedOnce = true;
              }
          }
        });
        }
      } catch (error) {
        console.error('Error loading spaces from Supabase:', error);
        // Return empty array on error - no localStorage fallback
        if (isMounted) {
          startTransition(() => {
            if (isMounted) {
            setSpaces([]);
              if (showLoading && !hasLoadedOnce) {
            setIsSpacesLoading(false);
                hasLoadedOnce = true;
              }
            }
          });
        }
      }
    };
    
    // Delay initial load to ensure we're not in render phase
    const initialLoadTimer = setTimeout(() => {
      if (isMounted) {
        loadSpaces(true);
      }
    }, 100);
    
    // Listen for space creation events to refresh immediately (without showing loading)
    const handleSpaceCreated = () => {
      // Use setTimeout to ensure we're not in render phase
      setTimeout(() => {
        if (isMounted) {
          loadSpaces(false);
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
    
    // Handle highlights updated event
    const handleHighlightsUpdated = () => {
      // Use setTimeout to ensure we're not in render phase
      setTimeout(async () => {
        if (isMounted) {
          try {
            const highlights = await highlightsServiceSupabase.getAllHighlights();
            startTransition(() => {
              if (isMounted) {
                setProjects(highlights);
              }
            });
          } catch (error) {
            console.error('Error refreshing highlights:', error);
          }
        }
      }, 0);
    };
    
    // Add event listeners after a small delay to avoid render phase issues
    setTimeout(() => {
      if (isMounted) {
    window.addEventListener('spaceCreated', handleSpaceCreated);
    window.addEventListener('questPublished', handleQuestPublished);
    window.addEventListener('highlightsUpdated', handleHighlightsUpdated);
      }
    }, 0);
    
    // Reload spaces periodically in case they change (without showing loading)
    // Start interval after initial load
    setTimeout(() => {
      if (isMounted) {
        intervalId = setInterval(() => {
          if (isMounted) {
            loadSpaces(false);
          }
        }, 30000);
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
      window.removeEventListener('highlightsUpdated', handleHighlightsUpdated);
    };
  }, []);


  const handleStartQuest = (questLink?: string) => {
    // Check primarily for address - more reliable than isConnected
    if (!address) {
      showToast('Please connect your wallet to start quests', 'warning');
      return;
    }
    showToast('Redirecting to quests...', 'info');
    // Navigate to quest link or default to quests page
    window.location.hash = questLink || '#quests';
  };

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

  // Get token status for a space from Supabase project_type column
  const getTokenStatus = (spaceId: string): { status: string; symbol?: string } => {
    const space = spaces.find(s => s.id === spaceId);
    const status = space?.projectType || 'undisclosed';
    // Capitalize first letter for display
    const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
    return { status: displayStatus, symbol: undefined };
  };

  const slideshowRef = useScrollAnimation();
  const spacesRef = useScrollAnimation();

  if (isLoading || projects.length === 0) {
    return <DiscoverPageSkeleton />;
  }

  const currentProject = projects[currentIndex];

  return (
    <div className="discover-earn-container">
      <h1 className="welcome-text">Welcome to TrustQuests</h1>
      <p className="welcome-description">
        Discover and complete blockchain quests on the Intuition network.
        Earn rewards, build your reputation, and connect with the Web3 community.
      </p>
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
          <div className="slideshow-container">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className={`slideshow-slide ${index === currentIndex ? 'active' : ''}`}
                onClick={() => handleStartQuest(project.questLink)}
                style={{ cursor: project.questLink ? 'pointer' : 'default' }}
              >
                <div
                  className="slideshow-image"
                  style={{
                    background: `linear-gradient(135deg, ${project.gradientColors[0]} 0%, ${project.gradientColors[1]} 100%)`
                  }}
                >

                  <svg viewBox="0 0 320 535" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{width: '180px', color: 'rgb(255, 255, 255)', position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(calc(-50% + 250px))'}}>
                    <path d="m277.296 319.617-.177 885.003 42.195-92.35.176-885.001-42.194 92.348Z" fill="#48494A"></path>
                    <path d="m118.014 344.353-.177 886.417 159.283-24.74.176-886.416-159.282 24.739Z" fill="#2F2E30"></path>
                    <path d="M.925 276.762.748 1166.55l117.088 67.6.177-889.789L.925 276.762Z" fill="#1B1C1C"></path>
                    <path d="m277.297 319.616 42.194-92.348-117.088-67.598L43.12 184.409.926 276.758l117.088 67.598 159.283-24.74Z"></path>
                    <path d="m9.463 274.51 38.913-85.246L200.83 165.57l110.288 63.729-38.913 85.246-152.453 23.704L9.463 274.51Z" fill="#403F42"></path>
                    <path d="m48.64 204.722 152.093-23.509 104.606 60.115 5.423-11.815-110.029-63.233L48.64 189.789 9.818 274.373l5.423 3.117 33.399-72.768Z" fill="url(#pedestal_svg__a)"></path>
                    <path d="m257.862 226.559 26.118 15.092-26.303 57.564-.001.003-.128.285-28.41 4.415-23.837 3.694-76.948 11.965h-.001l-7.034 1.086-10.883-6.292h-.001L70.855 291.52l-38.02-21.941 26.44-57.863 11.424-1.778 39.579-6.144 18.213-2.833 67.016-10.405 9.638 5.566.225-.39-.225.39 23.837 13.761 28.88 16.676Z" stroke="#000" stroke-width="0.901" fill="transparent"></path>
                    <path opacity="0.2" d="M180.113 281.73c29.395 0 53.225-12.529 53.225-27.985s-23.83-27.986-53.225-27.986c-29.394 0-53.224 12.53-53.224 27.986 0 15.456 23.83 27.985 53.224 27.985Z" fill="#000"></path>
                    <g transform="translate(136.124, 210.844) rotate(-5) scale(3)">
                      <defs>
                        <clipPath id="oval-clip">
                          <ellipse cx="0" cy="0" rx="44" ry="35"/>
                        </clipPath>
                      </defs>
                      <image href="/coin_4-removebg-preview.png" x="-44" y="-44" width="88" height="88" style={{opacity: 1}} clipPath="url(#oval-clip)" className="w-full"/>
                    </g>

                    <defs>
                      <linearGradient id="pedestal_svg__a" x1="57.235" y1="189.497" x2="257.141" y2="311.742" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#6E6E6E"></stop>
                        <stop offset="1" stop-color="#1B1C1C"></stop>
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Individual coin for each slide */}
                  {isMobile && (
                    <img
                      src="/coin_4-removebg-preview.png"
                      alt="TrustQuests Coin"
                      className="slide-coin"
                    />
                  )}

                </div>
                <div className="slideshow-info">
                  <div className="slideshow-header">
                    <h2 className="slideshow-title">{project.title}</h2>
                    {project.questCount && (
                      <div className="slideshow-quest-count">
                        <img src="/verified.svg" alt="Verified" width="16" height="16" />
                        {project.questCount} Quests
                      </div>
                    )}
                  </div>
                  <p className="slideshow-description">{project.description}</p>
                  <button
                    className="slideshow-start-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering slide click
                      handleStartQuest(project.questLink);
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="5 12 10 17 20 7"/>
                    </svg>
                    Start Quest
                  </button>
                </div>
              </div>
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

          <div className="slideshow-indicators">
            <div className="slideshow-dots-container">
              {projects.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  className={`slideshow-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Admin Edit Button */}
        {isAdmin && onEditHighlights && isPCDevice && (
          <div className="highlights-admin-controls">
            <button
              className="highlights-edit-button"
              onClick={() => {
                console.log('🎯 Edit Highlights button clicked');
                console.log('isAdmin:', isAdmin);
                console.log('onEditHighlights:', !!onEditHighlights);
                if (isAdmin) {
                  if (onEditHighlights) {
                    onEditHighlights();
                  }
                } else {
                  console.log('❌ User is not admin - cannot edit highlights');
                  // Show admin login hint
                  alert('Admin access required. Press Ctrl+Shift+A to login as admin.');
                }
              }}
              title={isAdmin ? "Edit Weekly Highlights" : "Admin access required - Press Ctrl+Shift+A"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Highlights
            </button>
          </div>
        )}

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
                      ) : (
                        <span className="space-token-status">{tokenInfo.status}</span>
                      )}
                    </div>
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