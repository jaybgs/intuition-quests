import { useState } from 'react';
import { useQuests } from '../hooks/useQuests';
import { QuestCard } from './QuestCard';
import { QuestCardSkeleton } from './Skeleton';
import { EmptyQuests } from './EmptyState';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import './QuestList.css';

interface QuestListProps {
  onQuestClick?: (questId: string) => void;
}

export function QuestList({ onQuestClick }: QuestListProps) {
  const { quests, isLoading } = useQuests();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const questListRef = useScrollAnimation();

  const filteredQuests = quests.filter(quest => {
    if (filter === 'completed') {
      // This would check if user completed it - mock for now
      return false;
    }
    return true;
  });

  return (
    <div ref={questListRef} className="quest-list">
      <div className="quest-list-header">
        <h2 className="quest-list-title">Available Quests</h2>
        <div className="quest-list-filters">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-button ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-button ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="quests-grid">
          {[...Array(6)].map((_, i) => (
            <QuestCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredQuests.length === 0 ? (
        <EmptyQuests />
      ) : (
        <div className="quests-grid">
          {filteredQuests.map((quest) => (
            <QuestCard 
              key={quest.id} 
              quest={quest}
              onClick={() => onQuestClick?.(quest.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}