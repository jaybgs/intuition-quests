import { useState } from 'react';
import { CommunityQuestCard } from './CommunityQuestCard';
import { QuestCardSkeleton } from './Skeleton';
import { EmptyQuests } from './EmptyState';
import { useQuests } from '../hooks/useQuests';
import './AllQuests.css';

interface AllQuestsProps {
  onBack?: () => void;
  onQuestClick?: (questId: string) => void;
}

export function AllQuests({ onBack, onQuestClick }: AllQuestsProps) {
  const { quests, isLoading } = useQuests();
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  
  // Filter community quests from real data
  const communityQuests = quests.filter(quest => {
    return quest.creatorType === 'community' || 
           (!quest.creatorType && quest.projectName?.toLowerCase().includes('community'));
  });

  const filteredQuests = filter === 'all' 
    ? communityQuests 
    : communityQuests.filter(quest => quest.difficulty?.toLowerCase() === filter);

  if (isLoading) {
    return (
      <div className="all-quests-container">
        <div className="all-quests-header">
          <button className="all-quests-back-button" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1 className="all-quests-title">All Community Quests</h1>
        </div>
        <div className="all-quests-loading">
          {[...Array(6)].map((_, i) => (
            <QuestCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (filteredQuests.length === 0) {
    return (
      <div className="all-quests-container">
        <div className="all-quests-header">
          <button className="all-quests-back-button" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1 className="all-quests-title">All Community Quests</h1>
        </div>
        <EmptyQuests />
      </div>
    );
  }

  return (
    <div className="all-quests-container">
      <div className="all-quests-header">
        <button className="all-quests-back-button" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 className="all-quests-title">All Community Quests</h1>
      </div>

      <div className="all-quests-filters">
        <button
          className={`all-quests-filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`all-quests-filter-button ${filter === 'beginner' ? 'active' : ''}`}
          onClick={() => setFilter('beginner')}
        >
          Beginner
        </button>
        <button
          className={`all-quests-filter-button ${filter === 'intermediate' ? 'active' : ''}`}
          onClick={() => setFilter('intermediate')}
        >
          Intermediate
        </button>
        <button
          className={`all-quests-filter-button ${filter === 'advanced' ? 'active' : ''}`}
          onClick={() => setFilter('advanced')}
        >
          Advanced
        </button>
      </div>

      <div className="all-quests-grid">
        {filteredQuests.map((quest) => (
          <CommunityQuestCard 
            key={quest.id}
            quest={quest} 
            onClick={() => {
              onQuestClick?.(quest.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}



