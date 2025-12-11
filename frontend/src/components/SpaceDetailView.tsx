import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import type { Space, Quest } from '../types';
import { useQuests } from '../hooks/useQuests';
import { CommunityQuestCard } from './CommunityQuestCard';
import { truncateUsername } from '../utils/usernameUtils';
import { followService } from '../services/followService';
import { subscriptionService } from '../services/subscriptionService';
import { showToast } from './Toast';
import './SpaceDetailView.css';

interface SpaceDetailViewProps {
  space: Space;
  onBack: () => void;
  onQuestClick?: (questId: string) => void;
  onBuilderAccess?: (spaceId: string) => void;
}

export function SpaceDetailView({ space, onBack, onQuestClick, onBuilderAccess }: SpaceDetailViewProps) {
  const { address } = useAccount();
  const { quests, isLoading: questsLoading } = useQuests();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isPro, setIsPro] = useState(false);
  
  // Check if current user is the owner of this space
  const isOwner = address && space.ownerAddress && address.toLowerCase() === space.ownerAddress.toLowerCase();
  
  // Filter quests for this space
  const spaceQuests = useMemo(() => {
    return quests.filter(q => 
      q.spaceId === space.id || 
      q.projectName?.toLowerCase() === space.name.toLowerCase() ||
      q.creatorAddress?.toLowerCase() === space.ownerAddress.toLowerCase()
    );
  }, [quests, space]);

  // Check if space owner has pro subscription
  useEffect(() => {
    const checkProStatus = () => {
      const ownerTier = subscriptionService.getSubscription(space.ownerAddress);
      setIsPro(ownerTier === 'pro');
    };
    checkProStatus();
  }, [space.ownerAddress]);

  // Load follow status and follower count
  useEffect(() => {
    const loadFollowData = async () => {
      if (address) {
        const following = await followService.isFollowing(address, space.id);
        setIsFollowing(following);
      }
      const count = await followService.getFollowerCount(space.id);
      setFollowerCount(count);
    };
    loadFollowData();
  }, [address, space.id]);

  // Handle follow/unfollow with optimistic update
  const handleFollow = async () => {
    if (!address) {
      showToast('Please connect your wallet to follow spaces', 'warning');
      return;
    }

    setIsLoadingFollow(true);
    try {
      // Optimistic update
      setIsFollowing((prev) => !prev);

      if (isFollowing) {
        const success = await followService.unfollowSpace(address, space.id);
        if (success) {
          const newCount = await followService.getFollowerCount(space.id);
          setFollowerCount(newCount);
          showToast('Unfollowed space', 'success');
        } else {
          // Revert
          setIsFollowing(true);
          showToast('Failed to unfollow space', 'error');
        }
      } else {
        const success = await followService.followSpace(address, space.id);
        if (success) {
          const newCount = await followService.getFollowerCount(space.id);
          setFollowerCount(newCount);
          showToast('Followed space', 'success');
        } else {
          // Revert
          setIsFollowing(false);
          showToast('Failed to follow space', 'error');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      showToast('An error occurred', 'error');
      // Revert on error
      setIsFollowing((prev) => !prev);
    } finally {
      setIsLoadingFollow(false);
    }
  };

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
    <>
      {/* Combined Banner and Main Container */}
      <div className="space-detail-wrapper">
      {/* Banner Section */}
      <div className="space-detail-banner">
        {space.coverPhoto && (
          <div 
            className="space-detail-banner-background"
            style={{
              backgroundImage: `url(${space.coverPhoto})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}
        {space.coverPhoto && <div className="space-detail-banner-overlay" />}
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
              <h1 className="space-detail-name">
                {space.name}
                {isPro && (
                  <span title="Verified" style={{ marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                    <img 
                      src="/verified.svg" 
                      alt="Verified" 
                      width="20" 
                      height="20"
                      style={{ 
                        display: 'inline-block',
                        verticalAlign: 'middle'
                      }}
                    />
                  </span>
                )}
              </h1>
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
                title="X (Twitter) Profile"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            )}
            {isOwner && onBuilderAccess && (
              <button 
                className="space-detail-follow-button"
                onClick={() => onBuilderAccess(space.id)}
                title="Builder Dashboard"
              >
                Builder Dashboard
              </button>
            )}
            {!isOwner && (
              <button 
                className={`space-detail-follow-button ${isFollowing ? 'following' : ''}`}
                onClick={handleFollow}
                disabled={isLoadingFollow}
              >
                {isLoadingFollow ? '...' : isFollowing ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-detail-main">
        <div className="space-detail-content-wrapper">
          {/* Left Column - Description and Quests */}
          <div className="space-detail-left">
            {/* Mobile Actions - Only visible on mobile */}
            <div className="space-detail-mobile-actions">
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
                  title="X (Twitter) Profile"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              )}
              {isOwner && onBuilderAccess && (
                <button 
                  className="space-detail-follow-button"
                  onClick={() => onBuilderAccess(space.id)}
                  title="Builder Dashboard"
                >
                  Builder Dashboard
                </button>
              )}
              {!isOwner && (
                <button 
                  className={`space-detail-follow-button ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollow}
                  disabled={isLoadingFollow}
                >
                  {isLoadingFollow ? '...' : isFollowing ? 'Following' : '+ Follow'}
                </button>
              )}
            </div>
            {/* Description */}
            <div className="space-detail-description-section">
              <p className="space-detail-description-text">
                {space.description}
                {space.description && space.description.length > 200 && (
                  <span className="space-detail-view-more"> View More</span>
                )}
              </p>
            </div>

            {/* Mobile Stats - Only visible on mobile */}
            <div className="space-detail-mobile-stats">
              <div className="space-detail-stats-card">
                <div className="space-detail-stat-item">
                  <div className="space-detail-stat-header">
                    <span className="space-detail-stat-label">Followers</span>
                    <span className="space-detail-stat-badge">#{followerCount > 999 ? '999+' : followerCount}</span>
                  </div>
                  <div className="space-detail-stat-value">{followerCount.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Quests Section */}
            <div className="space-detail-quests-section">
              <h2 className="space-detail-quests-title">Quests</h2>
              {questsLoading ? (
                <div className="space-detail-quests-skeletons">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-detail-quest-skeleton">
                      <div className="space-detail-quest-skeleton-title" />
                      <div className="space-detail-quest-skeleton-text" />
                      <div className="space-detail-quest-skeleton-text" style={{ width: '70%' }} />
                      <div className="space-detail-quest-skeleton-footer">
                        <div className="space-detail-quest-skeleton-chip" />
                        <div className="space-detail-quest-skeleton-chip" style={{ width: '60px' }} />
                      </div>
                    </div>
                  ))}
                </div>
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
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* End Combined Banner and Main Container */}

      {/* Back Button */}
      <button className="space-detail-back-button" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
    </>
  );
}
