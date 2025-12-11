import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { showToast } from './Toast';
import { spaceService } from '../services/spaceService';
import { DiscoverPageSkeleton } from './Skeleton';
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
  onSpaceClick?: (spaceId: string) => void;
}

export function ProjectSlideshow({ onQuestClick, onCreateSpace, onSpaceClick }: ProjectSlideshowProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [sortByVerified, setSortByVerified] = useState(false);
  const [sortByTrending, setSortByTrending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { address, status } = useAccount();
  const queryClient = useQueryClient();

  // Page loading skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
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
    const loadSpaces = async () => {
      try {
        // spaceService.getAllSpaces() is now async (Supabase)
        const allSpaces = await spaceService.getAllSpaces();
        setSpaces(allSpaces);
      } catch (error) {
        console.error('Error loading spaces:', error);
        // Fallback to empty array on error
        setSpaces([]);
      }
    };
    
    loadSpaces();
    
    // Listen for space creation events to refresh immediately
    const handleSpaceCreated = () => {
      loadSpaces();
    };
    
    // Listen for quest published events to refresh quest counts
    const handleQuestPublished = () => {
      // Force re-render to update quest counts
      setSpaces(prev => [...prev]);
    };
    
    window.addEventListener('spaceCreated', handleSpaceCreated);
    window.addEventListener('questPublished', handleQuestPublished);
    
    // Reload spaces periodically in case they change
    const interval = setInterval(loadSpaces, 3000); // Reduced to 3 seconds for faster updates
    return () => {
      clearInterval(interval);
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

  // Sort spaces based on active sort options
  const sortedSpaces = [...spaces].sort((a, b) => {
    const aVerified = a.userType === 'project';
    const bVerified = b.userType === 'project';
    const aFollowers = parseInt(localStorage.getItem(`space_followers_${a.id}`) || '0');
    const bFollowers = parseInt(localStorage.getItem(`space_followers_${b.id}`) || '0');
    
    // Priority 1: If sorting by verified, verified spaces come first
    if (sortByVerified) {
      if (aVerified && !bVerified) return -1;
      if (!aVerified && bVerified) return 1;
    }
    
    // Priority 2: If sorting by trending, spaces with more followers come first
    // This applies when:
    // - Only trending is active, OR
    // - Both are active and we're comparing within the same verified group
    if (sortByTrending) {
      const followerDiff = bFollowers - aFollowers;
      if (followerDiff !== 0) {
        return followerDiff;
      }
    }
    
    // Default: maintain original order
    return 0;
  });

  // Use sorted spaces (no filtering, just sorting)
  const filteredSpaces = sortedSpaces;

  // Get quest count for a space
  const getQuestCount = (spaceId: string): number => {
    try {
      let count = 0;
      
      // First, try to get quests from React Query cache
      const questsData = queryClient.getQueryData<Quest[]>(['quests']);
      if (questsData && Array.isArray(questsData)) {
        questsData.forEach((quest: any) => {
          // Count active quests that belong to this space (check both spaceId and projectId for compatibility)
          if ((quest.status === 'active' || !quest.status) && 
              (quest.spaceId === spaceId || quest.projectId === spaceId)) {
            count++;
          }
        });
      }
      
      // Also check localStorage as fallback
      const keys = Object.keys(localStorage);
      const publishedKeys = keys.filter(key => key.startsWith('published_quests_'));
      
      publishedKeys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsedQuests = JSON.parse(stored);
            parsedQuests.forEach((quest: any) => {
              // Count active quests that belong to this space (check both spaceId and projectId for compatibility)
              // Only count if not already counted from React Query cache
              if ((quest.status === 'active' || !quest.status) && 
                  (quest.spaceId === spaceId || quest.projectId === spaceId)) {
                // Check if this quest was already counted from React Query
                const alreadyCounted = questsData?.some(q => q.id === quest.id);
                if (!alreadyCounted) {
                  count++;
                }
              }
            });
          }
        } catch (error) {
          // Ignore errors
        }
      });
      
      return count;
    } catch (error) {
      return 0;
    }
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
  const ecosystemRef = useScrollAnimation();

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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Verified
            </button>
            <button
              className={`spaces-filter-button ${sortByTrending ? 'active' : ''}`}
              onClick={() => setSortByTrending(!sortByTrending)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="3" x2="21" y2="3"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="21" x2="21" y2="21"/>
              </svg>
              Trending
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
          {filteredSpaces.length === 0 ? (
            <div className="spaces-empty">
              <p>No spaces found. Create your first space to get started!</p>
            </div>
          ) : (
            filteredSpaces.map((space) => {
              const questCount = getQuestCount(space.id);
              const followerCount = getFollowerCount(space.id);
              const tokenInfo = getTokenStatus(space.id);
              
              return (
                <div
                  key={space.id}
                  className="space-card"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ Space card clicked directly, space:', space.name, 'id:', space.id);
                    // Call onSpaceClick if provided, otherwise navigate directly
                    if (onSpaceClick) {
                      console.log('📞 Calling onSpaceClick handler');
                      onSpaceClick(space.id);
                    } else {
                      console.log('⚠️ No onSpaceClick handler, navigating directly');
                      const spaceSlug = space.slug || space.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                      navigate(`/space-${spaceSlug}`);
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                  </div>
                  <div className="space-card-content">
                    <h3 className="space-name">{space.name}</h3>
                    <div className="space-stats">
                      <div className="space-followers">
                        {followerCount > 0 ? `${(followerCount / 1000).toFixed(1)}K+` : '0'} Followers
                      </div>
                      <div className={`space-quests ${questCount > 0 ? 'active' : ''}`}>
                        {questCount} active
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
      </div>

      {/* Ecosystem dApps Section */}
      <div ref={ecosystemRef} className="ecosystem-dapps-section">
        <div className="ecosystem-dapps-header">
          <h2 className="ecosystem-dapps-title">Ecosystem dApps</h2>
        </div>
        <div className="ecosystem-dapps-grid">
          <a
            href="https://portal.intuition.systems"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">The Portal</h3>
              <p className="ecosystem-dapp-description">
                The flagship app of Intuition, and the first Intuition explorer.
              </p>
              <div className="ecosystem-dapp-link">
                Visit App
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M7 7h10v10"/>
                </svg>
              </div>
            </div>
          </a>

          <a
            href="https://launchpad.intuition.systems"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">The Launchpad</h3>
              <p className="ecosystem-dapp-description">
                Complete quests and earn IQ points as you learn more about Intuition through structured experiences.
              </p>
              <div className="ecosystem-dapp-link">
                Visit App
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M7 7h10v10"/>
                </svg>
              </div>
            </div>
          </a>

          <a
            href="https://upload.intuition.systems"
            target="_blank"
            rel="noopener noreferrer"
            className="ecosystem-dapp-card"
          >
            <div className="ecosystem-dapp-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="ecosystem-dapp-content">
              <h3 className="ecosystem-dapp-name">Data Uploader</h3>
              <p className="ecosystem-dapp-description">
                Upload data en-masse to Intuition, and get rewarded for your contributions.
              </p>
              <div className="ecosystem-dapp-link">
                Visit App
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M7 7h10v10"/>
                </svg>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}