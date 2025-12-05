import React from 'react';
import './Skeleton.css';

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function QuestCardSkeleton() {
  return (
    <div className="quest-card-skeleton">
      <Skeleton className="skeleton-image" />
      <div className="skeleton-content">
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-text" />
        <Skeleton className="skeleton-text skeleton-text-short" />
        <div className="skeleton-footer">
          <Skeleton className="skeleton-badge" />
          <Skeleton className="skeleton-badge" />
        </div>
      </div>
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="leaderboard-row-skeleton">
      <Skeleton className="skeleton-rank" />
      <Skeleton className="skeleton-avatar" />
      <Skeleton className="skeleton-name" />
      <Skeleton className="skeleton-xp" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="profile-skeleton">
      <Skeleton className="skeleton-avatar-large" />
      <Skeleton className="skeleton-name" />
      <Skeleton className="skeleton-text" />
      <Skeleton className="skeleton-text skeleton-text-short" />
    </div>
  );
}

export function RaidCardSkeleton() {
  return (
    <div className="raid-card-skeleton">
      <Skeleton className="skeleton-image" />
      <div className="skeleton-content">
        <Skeleton className="skeleton-title" />
        <div className="skeleton-details">
          <Skeleton className="skeleton-detail-item" />
          <Skeleton className="skeleton-detail-item" />
          <Skeleton className="skeleton-detail-item" />
          <Skeleton className="skeleton-detail-item" />
        </div>
        <Skeleton className="skeleton-button" />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="stats-card-skeleton">
      <Skeleton className="skeleton-icon" />
      <div className="skeleton-stat-content">
        <Skeleton className="skeleton-stat-label" />
        <Skeleton className="skeleton-stat-value" />
      </div>
    </div>
  );
}

export function SpaceCardSkeleton() {
  return (
    <div className="space-card-skeleton">
      <Skeleton className="skeleton-space-logo" />
      <Skeleton className="skeleton-space-name" />
      <Skeleton className="skeleton-space-members" />
    </div>
  );
}

export function RewardCardSkeleton() {
  return (
    <div className="reward-card-skeleton">
      <Skeleton className="skeleton-reward-icon" />
      <Skeleton className="skeleton-reward-title" />
      <Skeleton className="skeleton-reward-value" />
    </div>
  );
}

// Page-level Skeletons
export function RaidsPageSkeleton() {
  return (
    <div className="page-skeleton raids-page-skeleton">
      <Skeleton className="skeleton-header" />
      <div className="skeleton-nav-bar">
        <Skeleton className="skeleton-nav-button" />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton className="skeleton-nav-button" />
          <Skeleton className="skeleton-nav-button" />
        </div>
        <Skeleton className="skeleton-nav-button" />
      </div>
      <div className="skeleton-grid">
        {[...Array(8)].map((_, i) => (
          <RaidCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function CommunityPageSkeleton() {
  return (
    <div className="page-skeleton community-page-skeleton">
      <div>
        <Skeleton className="skeleton-section-title" />
        <div className="skeleton-spaces-grid">
          {[...Array(6)].map((_, i) => (
            <SpaceCardSkeleton key={i} />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="skeleton-section-title" />
        <div className="skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {[...Array(4)].map((_, i) => (
            <QuestCardSkeleton key={i} />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="skeleton-section-title" />
        {[...Array(5)].map((_, i) => (
          <LeaderboardRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function RewardsPageSkeleton() {
  return (
    <div className="page-skeleton rewards-page-skeleton">
      <Skeleton className="skeleton-rewards-header" />
      <div className="skeleton-rewards-grid">
        {[...Array(6)].map((_, i) => (
          <RewardCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}


export function DiscoverPageSkeleton() {
  return (
    <div className="page-skeleton discover-page-skeleton">
      <Skeleton className="skeleton-slideshow" />
      <div>
        <Skeleton className="skeleton-section-title" style={{ width: '200px', height: '32px', marginBottom: '20px' }} />
        <div className="skeleton-featured-grid">
          {[...Array(6)].map((_, i) => (
            <QuestCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-skeleton dashboard-skeleton">
      <div className="skeleton-profile-header">
        <Skeleton className="skeleton-avatar-large" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton className="skeleton-title" style={{ width: '200px' }} />
          <Skeleton className="skeleton-text" style={{ width: '300px' }} />
        </div>
      </div>
      <div className="skeleton-stats-row">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      <div>
        <Skeleton className="skeleton-section-title" style={{ width: '150px', height: '24px', marginBottom: '16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {[...Array(3)].map((_, i) => (
            <QuestCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
