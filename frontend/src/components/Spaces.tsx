import { useState, useEffect, useMemo } from 'react';
import { spaceService } from '../services/spaceService';
import { questServiceSupabase } from '../services/questServiceSupabase';
import { useAccount } from 'wagmi';
import { SpaceCardSkeleton } from './Skeleton';
import type { Space } from '../types';
import './Spaces.css';
import './ProjectSlideshow.css';

interface SpacesProps {
  onSpaceClick?: (space: Space) => void;
  onCreateSpace?: () => void;
}

export function Spaces({ onSpaceClick, onCreateSpace }: SpacesProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByVerified, setSortByVerified] = useState(false);
  const [sortByTrending, setSortByTrending] = useState(false);
  const [sortByFollowing, setSortByFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
  const { address } = useAccount();

  // Load spaces
  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const allSpaces = await spaceService.getAllSpaces();
        setSpaces(allSpaces);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading spaces:', error);
        setSpaces([]);
        setIsLoading(false);
      }
    };

    loadSpaces();

    const handleSpaceCreated = () => {
      loadSpaces();
    };

    window.addEventListener('spaceCreated', handleSpaceCreated);
    return () => {
      window.removeEventListener('spaceCreated', handleSpaceCreated);
    };
  }, []);

  // Fetch quest counts
  useEffect(() => {
    const fetchQuestCounts = async () => {
      if (spaces.length === 0) return;

      try {
        const counts: Record<string, number> = {};

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

  // Check if user is following a space
  const isFollowingSpace = (spaceId: string): boolean => {
    if (!address) return false;
    const following = JSON.parse(localStorage.getItem(`user_following_${address}`) || '[]');
    return following.includes(spaceId);
  };

  // Get quest count for a space
  const getQuestCount = (spaceId: string): number => {
    return questCounts[spaceId] || 0;
  };

  // Get follower count for a space
  const getFollowerCount = (spaceId: string): number => {
    return parseInt(localStorage.getItem(`space_followers_${spaceId}`) || '0');
  };

  // Get token status for a space
  const getTokenStatus = (spaceId: string): { status: string; symbol?: string } => {
    const status = localStorage.getItem(`space_token_status_${spaceId}`) || 'Undisclosed';
    const symbol = localStorage.getItem(`space_token_symbol_${spaceId}`) || undefined;
    return { status, symbol };
  };

  // Filter and sort spaces
  const filteredAndSortedSpaces = useMemo(() => {
    let result = [...spaces];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(space =>
        space.name.toLowerCase().includes(query) ||
        space.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const aVerified = a.userType === 'project';
      const bVerified = b.userType === 'project';
      const aFollowers = getFollowerCount(a.id);
      const bFollowers = getFollowerCount(b.id);
      const aFollowing = isFollowingSpace(a.id);
      const bFollowing = isFollowingSpace(b.id);

      // Priority 1: Verified
      if (sortByVerified) {
        if (aVerified && !bVerified) return -1;
        if (!aVerified && bVerified) return 1;
      }

      // Priority 2: Following
      if (sortByFollowing) {
        if (aFollowing && !bFollowing) return -1;
        if (!aFollowing && bFollowing) return 1;
      }

      // Priority 3: Trending (by followers)
      if (sortByTrending) {
        const followerDiff = bFollowers - aFollowers;
        if (followerDiff !== 0) {
          return followerDiff;
        }
      }

      return 0;
    });

    return result;
  }, [spaces, searchQuery, sortByVerified, sortByTrending, sortByFollowing, address]);

  return (
    <div className="spaces-page">
      <div className="spaces-page-header">
        <h1 className="spaces-page-title">All Spaces</h1>
        <button
          className="spaces-page-create-button"
          onClick={() => {
            localStorage.setItem('spaceBuilderSource', 'spaces');
            onCreateSpace?.();
          }}
        >
          Create Space
        </button>
      </div>

      <div className="spaces-page-controls">
        <div className="spaces-page-search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="spaces-page-search-input"
          />
        </div>

        <div className="spaces-page-filters">
          <button
            className={`spaces-page-filter-button ${sortByVerified ? 'active' : ''}`}
            onClick={() => setSortByVerified(!sortByVerified)}
          >
            <img src="/verified.svg" alt="Verified" width="16" height="16" />
            Verified
          </button>
          <button
            className={`spaces-page-filter-button ${sortByTrending ? 'active' : ''}`}
            onClick={() => setSortByTrending(!sortByTrending)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="3" x2="21" y2="3"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="21" x2="21" y2="21"/>
            </svg>
            Trending
          </button>
          <button
            className={`spaces-page-filter-button ${sortByFollowing ? 'active' : ''}`}
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
      </div>

      <div className="spaces-page-grid">
        {isLoading ? (
          <>
            {[...Array(12)].map((_, index) => (
              <SpaceCardSkeleton key={`skeleton-${index}`} />
            ))}
          </>
        ) : filteredAndSortedSpaces.length === 0 ? (
          <div className="spaces-page-empty">
            <p>{searchQuery ? 'No spaces found matching your search.' : 'No spaces found. Create your first space to get started!'}</p>
          </div>
        ) : (
          filteredAndSortedSpaces.map((space) => {
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
    </div>
  );
}

