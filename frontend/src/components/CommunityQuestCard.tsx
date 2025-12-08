import { useState } from 'react';
import { Quest } from '../types';
import { useAccount } from 'wagmi';
import { truncateUsername } from '../utils/usernameUtils';
import './CommunityQuestCard.css';

// Helper function to get profile picture from localStorage
const getStoredProfilePic = (address: string | undefined): string | null => {
  if (!address) return null;
  try {
    const stored = localStorage.getItem(`profilePic_${address.toLowerCase()}`);
    return stored ? stored : null;
  } catch (error) {
    return null;
  }
};

interface CommunityQuestCardProps {
  quest: Quest;
  onClick: () => void;
}

export function CommunityQuestCard({ quest, onClick }: CommunityQuestCardProps) {
  const { address } = useAccount();
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if quest is completed by checking both completedBy array and claimed quests
  const claimedQuests = address 
    ? JSON.parse(localStorage.getItem(`claimed_quests_${address.toLowerCase()}`) || '[]')
    : [];
  const isCompleted = quest.completedBy?.includes(address?.toLowerCase() || '') || 
                      claimedQuests.includes(quest.id);
  
  // Get participant count
  const participantCount = quest.completedBy?.length || 0;
  
  // Format creator address - truncate to 7 characters
  const creatorAddress = quest.creatorAddress || '0x0000...0000';
  const displayAddress = truncateUsername(creatorAddress, 7);
  
  // Get creator profile picture
  const creatorProfilePic = getStoredProfilePic(creatorAddress);

  return (
    <div 
      className={`community-quest-card ${isHovered ? 'hovered' : ''} ${isCompleted ? 'completed' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="quest-content">
        <div className="quest-header">
          {quest.difficulty && (
            <span className={`quest-difficulty difficulty-${quest.difficulty}`}>
              {quest.difficulty.toUpperCase()}
            </span>
          )}
          {quest.estimatedTime && (
            <span className="quest-time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              {quest.estimatedTime}
            </span>
          )}
        </div>

        <h3 className="quest-title">{quest.title}</h3>

        <div className="quest-footer">
          <div className="quest-creator">
            <div className="creator-avatar">
              {creatorProfilePic ? (
                <img 
                  src={creatorProfilePic} 
                  alt={displayAddress}
                  className="creator-avatar-img"
                  onError={(e) => {
                    // Fallback to profile icon if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const icon = target.nextElementSibling as HTMLElement;
                    if (icon) icon.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="creator-avatar-icon" style={{ display: creatorProfilePic ? 'none' : 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
            <div className="creator-info">
              <span className="creator-label">Created by</span>
              <span className="creator-address">{displayAddress}</span>
            </div>
          </div>
          
          <div className="quest-rewards">
            <div className={`xp-badge ${isCompleted ? 'completed' : ''}`}>
              {isCompleted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              )}
              <span>{quest.iqPoints ?? quest.xpReward ?? 100} IQ</span>
            </div>
            {participantCount > 0 && (
              <div className="participant-count">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>{participantCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}