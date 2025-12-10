import { useState } from 'react';
import { Quest } from '../types';
import { useAccount } from 'wagmi';
import { useQuests } from '../hooks/useQuests';
import { showToast } from './Toast';
import './QuestCard.css';

interface QuestCardProps {
  quest: Quest;
  onClick?: () => void;
}

export function QuestCard({ quest }: QuestCardProps) {
  const { address } = useAccount();
  const { completeQuest, isCompleting } = useQuests();
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = quest.completedBy?.includes(address?.toLowerCase() || '');
  
  // Get participant count from quest completions
  const participantCount = quest.completedBy?.length || 0;
  
  // Calculate progress (mock for now - would come from quest data)
  const progress = quest.progress || 0;
  const hasProgress = quest.steps && quest.steps.length > 0;
  const completedSteps = quest.completedSteps || 0;
  const totalSteps = quest.steps?.length || 1;

  const handleComplete = async () => {
    // Prevent quest creator from joining their own quest (unspoken rule)
    if (address && quest.creatorAddress && address.toLowerCase() === quest.creatorAddress.toLowerCase()) {
      return;
    }

    if (address && !isCompleted) {
      try {
        await completeQuest(quest.id);
        showToast('Quest completed successfully!', 'success');
      } catch (error) {
        showToast('Failed to complete quest. Please try again.', 'error');
      }
    } else if (!address) {
      showToast('Please connect your wallet to start quests', 'warning');
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: quest.title,
        text: quest.description,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!', 'success');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return 'var(--accent-blue)';
    }
  };

  return (
    <div 
      className={`quest-card ${isHovered ? 'quest-card-hovered' : ''} ${isCompleted ? 'quest-card-completed' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="quest-image">
        <div className="quest-image-placeholder">
          {quest.projectName.charAt(0).toUpperCase()}
        </div>
        {isCompleted && (
          <div className="quest-completed-overlay">
            <img src="/verified.svg" alt="Verified" width="48" height="48" />
          </div>
        )}
        {quest.difficulty && (
          <div 
            className="quest-difficulty-badge"
            style={{ backgroundColor: getDifficultyColor(quest.difficulty) }}
          >
            {quest.difficulty}
          </div>
        )}
        {isHovered && (
          <div className="quest-quick-actions">
            <button 
              className="quest-action-button"
              onClick={handleShare}
              title="Share quest"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="quest-content">
        <div className="quest-header">
          <h3 className="quest-title">{quest.title}</h3>
          <span className="xp-badge">{quest.iqPoints ?? quest.xpReward ?? 100} IQ</span>
        </div>
        <p className="quest-description">{quest.description}</p>
        
        {hasProgress && !isCompleted && (
          <div className="quest-progress-container">
            <div className="quest-progress-header">
              <span className="quest-progress-label">Progress</span>
              <span className="quest-progress-text">{completedSteps}/{totalSteps} steps</span>
            </div>
            <div className="quest-progress-bar">
              <div 
                className="quest-progress-fill"
                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="quest-meta">
          <div className="quest-participants">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>{formatNumber(participantCount)}</span>
          </div>
          <div className="quest-project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <span>{quest.projectName}</span>
          </div>
          {quest.estimatedTime && (
            <div className="quest-time">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{quest.estimatedTime}</span>
            </div>
          )}
        </div>
        {isCompleted ? (
          <div className="quest-completed-state">
            <span className="completed-badge">
              <img src="/verified.svg" alt="Verified" width="16" height="16" />
              Completed
            </span>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleComplete();
            }}
            disabled={!address || isCompleting || (address && quest.creatorAddress && address.toLowerCase() === quest.creatorAddress.toLowerCase())}
            className="complete-button"
          >
            {isCompleting ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Completing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="5 12 10 17 20 7"/>
                </svg>
                Start Quest
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
