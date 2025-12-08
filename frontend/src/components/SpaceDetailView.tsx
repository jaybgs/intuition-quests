import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import type { Space, Quest } from '../types';
import { useQuests } from '../hooks/useQuests';
import { CommunityQuestCard } from './CommunityQuestCard';
import { truncateUsername } from '../utils/usernameUtils';
import './SpaceDetailView.css';

interface SpaceDetailViewProps {
  space: Space;
  onBack: () => void;
  onQuestClick?: (questId: string) => void;
}

export function SpaceDetailView({ space, onBack, onQuestClick }: SpaceDetailViewProps) {
  const { address } = useAccount();
  const { quests, isLoading: questsLoading } = useQuests();
  
  // Filter quests for this space
  const spaceQuests = useMemo(() => {
    return quests.filter(q => 
      q.spaceId === space.id || 
      q.projectName?.toLowerCase() === space.name.toLowerCase() ||
      q.creatorAddress?.toLowerCase() === space.ownerAddress.toLowerCase()
    );
  }, [quests, space]);

  // Get follower count
  const followerCount = parseInt(localStorage.getItem(`space_followers_${space.id}`) || '0');
  
  // Get token status
  const tokenStatus = localStorage.getItem(`space_token_status_${space.id}`) || 'Undisclosed';
  const tokenSymbol = localStorage.getItem(`space_token_symbol_${space.id}`) || undefined;

  // Get project type tags
  const getProjectTypeTags = () => {
    if (space.userType !== 'project') return [];
    if (!space.projectType || space.projectType === 'undisclosed') return [];
    
    const tags = [];
    if (space.projectType === 'defi') tags.push('DeFi');
    if (space.projectType === 'infofi') tags.push('InfoFi');
    if (space.projectType === 'other' && space.projectTypeOther) {
      tags.push(space.projectTypeOther);
    }
    return tags;
  };

  const projectTags = getProjectTypeTags();

  return (
    <div className="space-detail-container">
      {/* Banner Section */}
      <div className="space-detail-banner">
        <div className="space-detail-banner-content">
          <div className="space-detail-profile-section">
            <div className="space-detail-logo-wrapper">
              {space.logo ? (
                <img src={space.logo} alt={space.name} className="space-detail-logo" />
              ) : (
                <div className="space-detail-logo-placeholder">
                  {space.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="space-detail-name-section">
              <h1 className="space-detail-name">{space.name}</h1>
              {projectTags.length > 0 && (
                <div className="space-detail-tags">
                  {projectTags.map((tag, index) => (
                    <span key={index} className="space-detail-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-detail-actions">
            <button className="space-detail-action-button" title="More options">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1"/>
                <circle cx="12" cy="5" r="1"/>
                <circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            {space.twitterUrl && (
              <a 
                href={space.twitterUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="space-detail-action-button"
                title="X Profile"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
            )}
            <button className="space-detail-follow-button">
              + Follow
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-detail-main">
        <div className="space-detail-content-wrapper">
          {/* Left Column - Description and Quests */}
          <div className="space-detail-left">
            {/* Description */}
            <div className="space-detail-description-section">
              <p className="space-detail-description-text">
                {space.description}
                {space.description.length > 200 && (
                  <span className="space-detail-view-more"> View More</span>
                )}
              </p>
            </div>

            {/* Quests Section */}
            <div className="space-detail-quests-section">
              <h2 className="space-detail-quests-title">Quests</h2>
              {questsLoading ? (
                <div className="space-detail-loading">Loading quests...</div>
              ) : spaceQuests.length === 0 ? (
                <div className="space-detail-empty-quests">
                  <p>No quests available for this space yet.</p>
                </div>
              ) : (
                <div className="space-detail-quests-grid">
                  {spaceQuests.map((quest) => (
                    <CommunityQuestCard
                      key={quest.id}
                      quest={quest}
                      onClick={() => onQuestClick?.(quest.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-detail-right">
            <div className="space-detail-stats-card">
              <div className="space-detail-stat-item">
                <div className="space-detail-stat-header">
                  <span className="space-detail-stat-label">Followers</span>
                  <span className="space-detail-stat-badge">#{followerCount > 999 ? '999+' : followerCount}</span>
                </div>
                <div className="space-detail-stat-value">{followerCount.toLocaleString()}</div>
              </div>
              <div className="space-detail-stat-item">
                <div className="space-detail-stat-header">
                  <span className="space-detail-stat-label">Token</span>
                  <button className="space-detail-stat-info" title="Token information">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                  </button>
                </div>
                <div className="space-detail-stat-value">
                  {tokenSymbol ? tokenSymbol : tokenStatus}
                </div>
              </div>
              <div className="space-detail-stat-item">
                <div className="space-detail-stat-header">
                  <span className="space-detail-stat-label">Backer</span>
                  <button className="space-detail-stat-info" title="Backer information">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                  </button>
                </div>
                <div className="space-detail-stat-value">--</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <button className="space-detail-back-button" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
    </div>
  );
}
