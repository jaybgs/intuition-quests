import { useState, useEffect, useRef } from 'react';
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

  // Simulate loading state for skeleton demo
  const [isPageLoading, setIsPageLoading] = useState(true);
  const questsGridRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const element = questsGridRef.current;
    if (!element) return;

    let animationTimeouts: NodeJS.Timeout[] = [];
    let hasAnimated = false;
    const animatedCards = new Set<Element>();

    const animateQuests = () => {
      if (hasAnimated) return;
      hasAnimated = true;
      element.classList.add('animate-in');
      const questCards = element.querySelectorAll('.quest-card-wrapper');
      questCards.forEach((card, index) => {
        if (!animatedCards.has(card)) {
          animatedCards.add(card);
          const timeout = setTimeout(() => {
            card.classList.add('animate-in');
          }, index * 100);
          animationTimeouts.push(timeout);
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateQuests();
            // Once animated, stop observing to prevent re-triggering
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px 0px 0px 0px' }
    );

    // Check if element is already in view on mount
    const rect = element.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isInView) {
      // If already in view, animate immediately
      animateQuests();
    } else {
      observer.observe(element);
      // Fallback: make quests visible after 2 seconds even if observer doesn't trigger
      const fallbackTimeout = setTimeout(() => {
        if (!hasAnimated) {
          animateQuests();
        }
      }, 2000);
      animationTimeouts.push(fallbackTimeout);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      animationTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  if (isPageLoading) {
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

      <div ref={questsGridRef} className="community-quests-grid-container">
        <div className="community-quests-grid">
          {displayedQuests.map((quest, index) => (
            <div 
              key={quest.id}
              className={`quest-card-wrapper ${index < 6 ? 'immediate-visible' : ''}`}
            >
              <CommunityQuestCard 
                quest={quest} 
                onClick={() => {
                  onQuestClick?.(quest.id);
                }}
              />
            </div>
          ))}
        </div>
        {communityQuests.length > 9 && (
          <button 
            className="community-see-more-button"
            onClick={() => onSeeMoreQuests?.()}
          >
            See More
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>

      <CreateSpaceSection onCreateSpace={onCreateSpace} />
      
      <Leaderboard />
    </div>
  );
}