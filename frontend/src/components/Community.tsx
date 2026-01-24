import { useEffect } from 'react';
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

  // Filter community quests from real data
  const communityQuests = quests.filter(quest => {
    return quest.creatorType === 'community' ||
      (!quest.creatorType && quest.projectName?.toLowerCase().includes('community'));
  });

  // Show only first 9 quests in the grid (3 rows x 3 columns)
  const displayedQuests = communityQuests.slice(0, 9);

  if (isLoading) {
    return <CommunityPageSkeleton />;
  }

  if (communityQuests.length === 0) {
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

      <h2 className="community-quests-title">Quests</h2>

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
        {communityQuests.length > 9 && (
          <button
            className="community-see-more-button"
            onClick={() => onSeeMoreQuests?.()}
          >
            See More
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <CreateSpaceSection onCreateSpace={onCreateSpace} />

      <div id="leaderboard">
        <Leaderboard />
      </div>
    </div>
  );
}