import { useEffect, useState, useMemo } from 'react';
import { Reveal } from './Reveal';
import { CommunityQuestCard } from './CommunityQuestCard';
import { QuestCardSkeleton, CommunityPageSkeleton } from './Skeleton';
import { EmptyQuests } from './EmptyState';
import { CreateSpaceSection } from './CreateSpaceSection';
import { Leaderboard } from './Leaderboard';
import { useQuests } from '../hooks/useQuests';
import { useQueryClient } from '@tanstack/react-query';
import type { Quest } from '../types';
import './Community.css';
interface CommunityProps {
  onSeeMoreLeaderboard?: () => void;
  onQuestClick?: (questId: string) => void;
  onCreateSpace?: () => void;
  onSeeMoreQuests?: () => void;
}

export function Community({ onSeeMoreLeaderboard, onQuestClick, onCreateSpace, onSeeMoreQuests }: CommunityProps) {
  const { quests, isLoading } = useQuests();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'all' | 'active' | 'ended' | 'trust' | 'iq'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Listen for quest published events to refresh immediately
  useEffect(() => {
    const handleQuestPublished = () => {
      // Force immediate refetch when a quest is published
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.refetchQueries({ queryKey: ['quests'] });
    };

    window.addEventListener('questPublished', handleQuestPublished);
    return () => {
      window.removeEventListener('questPublished', handleQuestPublished);
    };
  }, [queryClient]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.community-filter-wrapper')) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter community quests from real data
  const filteredQuests = useMemo(() => {
    const now = Date.now();
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    return quests.filter(quest => {
      // 1. Must be a community quest
      const isCommunity = quest.creatorType === 'community' ||
        (!quest.creatorType && quest.projectName?.toLowerCase().includes('community'));

      if (!isCommunity) return false;

      // 2. 3-day expiration buffer rule
      // Quest disappears 3 days AFTER it has ended.
      // If no expiresAt, it's always visible (active).
      // If expiresAt exists, it is visible until expiresAt + 3 days.
      if (quest.expiresAt && now > (quest.expiresAt + THREE_DAYS_MS)) {
        return false;
      }

      // 3. Apply Filter Selection
      switch (filterType) {
        case 'active':
          return (!quest.expiresAt || quest.expiresAt > now) && quest.status === 'active';
        case 'ended':
          return (quest.expiresAt && quest.expiresAt <= now) || quest.status !== 'active';
        case 'trust':
          return (quest as any).trustReward && (quest as any).trustReward > 0;
        case 'iq':
          return quest.xpReward && quest.xpReward > 0;
        default:
          return true;
      }
    }).sort((a, b) => {
      // Sort: active quests first, then ended quests
      const aIsActive = (!a.expiresAt || a.expiresAt > now) && a.status === 'active';
      const bIsActive = (!b.expiresAt || b.expiresAt > now) && b.status === 'active';

      // Active quests come first
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // Within same category, sort by creation date (newest first)
      return b.createdAt - a.createdAt;
    });
  }, [quests, filterType]);

  // Show only first 9 quests of the FILTERED list
  const displayedQuests = filteredQuests.slice(0, 9);

  if (isLoading) {
    return <CommunityPageSkeleton />;
  }

  if (filteredQuests.length === 0 && filterType === 'all') {
    return (
      <div className="community-container">
        <div className="community-banner">
          <h2 className="community-banner-text">
            Discover & Explore Quests created by the Intuition Community
          </h2>
        </div>
        <EmptyQuests />
      </div>
    );
  }

  return (
    <div className="community-container">
      <div className="community-banner">
        <h2 className="community-banner-text">
          Discover & Explore Quests created by the Intuition Community
        </h2>
        <img
          src="/community-logo.svg"
          alt="Community Logo"
          className="community-banner-logo"
          onError={(e) => {
            console.error('Failed to load community-logo.svg');
          }}
          onLoad={() => {
            console.log('Community logo SVG loaded successfully');
          }}
        />
        <img
          src="/community-rec.svg"
          alt="Community Rec"
          className="community-banner-svg"
          onError={(e) => {
            console.error('Failed to load community-rec.svg');
          }}
        />
      </div>


      <div className="community-quests-header">
        <h2 className="community-quests-title">Quests</h2>

        {/* Filter Button */}
        <div className="community-filter-wrapper">
          <button
            className={`community-filter-button ${filterType !== 'all' ? 'active' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Filter quests"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {filterType !== 'all' && <span className="community-filter-badge" />}
          </button>
          {isFilterOpen && (
            <div className="community-filter-dropdown">
              <button
                className={`community-filter-option ${filterType === 'all' ? 'selected' : ''}`}
                onClick={() => { setFilterType('all'); setIsFilterOpen(false); }}
              >
                <span>All Quests</span>
                {filterType === 'all' && <span className="community-filter-check">✓</span>}
              </button>
              <button
                className={`community-filter-option ${filterType === 'active' ? 'selected' : ''}`}
                onClick={() => { setFilterType('active'); setIsFilterOpen(false); }}
              >
                <span>Active</span>
                {filterType === 'active' && <span className="community-filter-check">✓</span>}
              </button>
              <button
                className={`community-filter-option ${filterType === 'ended' ? 'selected' : ''}`}
                onClick={() => { setFilterType('ended'); setIsFilterOpen(false); }}
              >
                <span>Ended</span>
                {filterType === 'ended' && <span className="community-filter-check">✓</span>}
              </button>
              <div className="community-filter-divider" />
              <button
                className={`community-filter-option ${filterType === 'trust' ? 'selected' : ''}`}
                onClick={() => { setFilterType('trust'); setIsFilterOpen(false); }}
              >
                <span>Trust Rewards</span>
                {filterType === 'trust' && <span className="community-filter-check">✓</span>}
              </button>
              <button
                className={`community-filter-option ${filterType === 'iq' ? 'selected' : ''}`}
                onClick={() => { setFilterType('iq'); setIsFilterOpen(false); }}
              >
                <span>IQ Rewards</span>
                {filterType === 'iq' && <span className="community-filter-check">✓</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="community-quests-grid-container">
        <div className="community-quests-grid">
          {displayedQuests.map((quest, index) => (
            <Reveal key={quest.id} delay={index * 50} width="100%">
              <div
                className={`quest-card-wrapper`}
              >
                <CommunityQuestCard
                  quest={quest}
                  onClick={() => {
                    onQuestClick?.(quest.id);
                  }}
                />
              </div>
            </Reveal>
          ))}
        </div>

        {
          filteredQuests.length === 0 ? (
            <div className="community-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '16px' }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>No Matching Quests</p>
              <p style={{ margin: '8px 0 0', fontSize: '14px' }}>No quests match the selected filter.</p>
            </div>
          ) : filteredQuests.length > 9 && (
            <button
              className="community-see-more-button"
              onClick={() => onSeeMoreQuests?.()}
            >
              See More
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )
        }
      </div >

      <CreateSpaceSection onCreateSpace={onCreateSpace} />

      <div id="leaderboard">
        <Leaderboard />
      </div>
    </div >
  );
}