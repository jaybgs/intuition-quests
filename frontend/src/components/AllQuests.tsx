import { useState, useEffect, useMemo } from 'react';
import { CommunityQuestCard } from './CommunityQuestCard';
import { QuestCardSkeleton } from './Skeleton';
import { EmptyQuests } from './EmptyState';
import { useQuests } from '../hooks/useQuests';
import { spaceService } from '../services/spaceService';
import type { Space } from '../types';
import './AllQuests.css';

interface AllQuestsProps {
  onBack?: () => void;
  onQuestClick?: (questId: string) => void;
}

export function AllQuests({ onBack, onQuestClick }: AllQuestsProps) {
  const { quests, isLoading } = useQuests();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const [spaceFilter, setSpaceFilter] = useState<string>('all');
  const [minReward, setMinReward] = useState('');
  const [maxReward, setMaxReward] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Load spaces for filter
  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const allSpaces = await spaceService.getAllSpaces();
        setSpaces(allSpaces);
      } catch (error) {
        console.error('Error loading spaces:', error);
      }
    };
    loadSpaces();
  }, []);
  
  // Filter community quests from real data
  const communityQuests = useMemo(() => {
    return quests.filter(quest => {
      return quest.creatorType === 'community' || 
             (!quest.creatorType && quest.projectName?.toLowerCase().includes('community'));
    });
  }, [quests]);

  // Apply all filters
  const filteredQuests = useMemo(() => {
    let filtered = [...communityQuests];
    
    // Keyword search
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(quest => {
        const titleMatch = quest.title?.toLowerCase().includes(keyword);
        const descMatch = quest.description?.toLowerCase().includes(keyword);
        const projectMatch = quest.projectName?.toLowerCase().includes(keyword);
        const idMatch = quest.id?.toLowerCase().includes(keyword);
        return titleMatch || descMatch || projectMatch || idMatch;
      });
    }
    
    // Difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(quest => 
        quest.difficulty?.toLowerCase() === difficultyFilter
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(quest => 
        quest.status?.toLowerCase() === statusFilter
      );
    }
    
    // Space filter
    if (spaceFilter !== 'all') {
      filtered = filtered.filter(quest => 
        quest.spaceId === spaceFilter
      );
    }
    
    // Rewards filter
    if (minReward || maxReward) {
      filtered = filtered.filter(quest => {
        const reward = quest.iqPoints || quest.xpReward || 0;
        const min = minReward ? parseInt(minReward, 10) : 0;
        const max = maxReward ? parseInt(maxReward, 10) : Infinity;
        return reward >= min && reward <= max;
      });
    }
    
    return filtered;
  }, [communityQuests, searchKeyword, difficultyFilter, statusFilter, spaceFilter, minReward, maxReward]);

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

      {/* Search Bar */}
      <div className="all-quests-search-container">
        <div className="all-quests-search-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="all-quests-search-icon">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="all-quests-search-input"
            placeholder="Search by title, description, or keywords..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          {searchKeyword && (
            <button
              className="all-quests-search-clear"
              onClick={() => setSearchKeyword('')}
            >
              ×
            </button>
          )}
        </div>
        <button
          className="all-quests-filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filters {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="all-quests-advanced-filters">
          <div className="all-quests-filter-section">
            <label className="all-quests-filter-label">Difficulty</label>
            <div className="all-quests-filter-buttons">
              <button
                className={`all-quests-filter-button ${difficultyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDifficultyFilter('all')}
              >
                All
              </button>
              <button
                className={`all-quests-filter-button ${difficultyFilter === 'beginner' ? 'active' : ''}`}
                onClick={() => setDifficultyFilter('beginner')}
              >
                Beginner
              </button>
              <button
                className={`all-quests-filter-button ${difficultyFilter === 'intermediate' ? 'active' : ''}`}
                onClick={() => setDifficultyFilter('intermediate')}
              >
                Intermediate
              </button>
              <button
                className={`all-quests-filter-button ${difficultyFilter === 'advanced' ? 'active' : ''}`}
                onClick={() => setDifficultyFilter('advanced')}
              >
                Advanced
              </button>
            </div>
          </div>

          <div className="all-quests-filter-section">
            <label className="all-quests-filter-label">Status</label>
            <div className="all-quests-filter-buttons">
              <button
                className={`all-quests-filter-button ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All
              </button>
              <button
                className={`all-quests-filter-button ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </button>
              <button
                className={`all-quests-filter-button ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </button>
              <button
                className={`all-quests-filter-button ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pending
              </button>
            </div>
          </div>

          <div className="all-quests-filter-section">
            <label className="all-quests-filter-label">Space</label>
            <select
              className="all-quests-filter-select"
              value={spaceFilter}
              onChange={(e) => setSpaceFilter(e.target.value)}
            >
              <option value="all">All Spaces</option>
              {spaces.map(space => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </div>

          <div className="all-quests-filter-section">
            <label className="all-quests-filter-label">Rewards (IQ Points)</label>
            <div className="all-quests-reward-range">
              <input
                type="number"
                className="all-quests-reward-input"
                placeholder="Min"
                value={minReward}
                onChange={(e) => setMinReward(e.target.value)}
                min="0"
              />
              <span className="all-quests-reward-separator">to</span>
              <input
                type="number"
                className="all-quests-reward-input"
                placeholder="Max"
                value={maxReward}
                onChange={(e) => setMaxReward(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <button
            className="all-quests-clear-filters"
            onClick={() => {
              setSearchKeyword('');
              setDifficultyFilter('all');
              setStatusFilter('all');
              setSpaceFilter('all');
              setMinReward('');
              setMaxReward('');
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className="all-quests-results-count">
        Showing {filteredQuests.length} of {communityQuests.length} quests
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



