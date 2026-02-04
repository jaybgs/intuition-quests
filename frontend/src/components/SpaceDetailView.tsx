import { useState, useEffect, useMemo } from 'react';
import { Reveal } from './Reveal';
import { useAccount } from 'wagmi';
import type { Space, Quest } from '../types';
import { useAdmin } from '../hooks/useAdmin';
import { CommunityQuestCard } from './CommunityQuestCard';
import { truncateUsername } from '../utils/usernameUtils';
import { followService } from '../services/followService';
import { subscriptionService } from '../services/subscriptionService';
import { questServiceSupabase } from '../services/questServiceSupabase';
import { showToast } from './Toast';
import './SpaceDetailView.css';

interface SpaceDetailViewProps {
    space: Space;
    onBack: () => void;
    onQuestClick?: (questId: string) => void;
    onBuilderAccess?: (spaceId: string) => void;
}

import { EditSpaceVisualsModal } from './EditSpaceVisualsModal';

export function SpaceDetailView({ space: initialSpace, onBack, onQuestClick, onBuilderAccess }: SpaceDetailViewProps) {
    const { address } = useAccount();
    const { isAuthenticated: isAdminLoggedIn } = useAdmin();
    // Use local state for space to support updates
    const [space, setSpace] = useState<Space>(initialSpace);
    const [spaceQuests, setSpaceQuests] = useState<Quest[]>([]);
    const [questsLoading, setQuestsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [isLoadingFollow, setIsLoadingFollow] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'active' | 'ended' | 'trust' | 'iq'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [showEditVisuals, setShowEditVisuals] = useState(false);

    // Update local space when prop changes
    useEffect(() => {
        setSpace(initialSpace);
    }, [initialSpace]);

    // Fetch ALL quests for this space (no time filter)
    useEffect(() => {
        const fetchSpaceQuests = async () => {
            setQuestsLoading(true);
            try {
                // Get all quests and filter for this space
                const allQuests = await questServiceSupabase.getAllQuests();

                // Filter quests for this space by spaceId, projectName, or creatorAddress
                const filteredQuests = allQuests.filter(q =>
                    q.spaceId === space.id ||
                    q.projectName?.toLowerCase() === space.name.toLowerCase() ||
                    q.creatorAddress?.toLowerCase() === space.ownerAddress?.toLowerCase()
                );

                // Sort: active quests first, then ended quests
                const now = Date.now();
                const sortedQuests = filteredQuests.sort((a, b) => {
                    const aIsActive = (!a.expiresAt || a.expiresAt > now) && a.status === 'active';
                    const bIsActive = (!b.expiresAt || b.expiresAt > now) && b.status === 'active';

                    // Active quests come first
                    if (aIsActive && !bIsActive) return -1;
                    if (!aIsActive && bIsActive) return 1;

                    // Within same category, sort by creation date (newest first)
                    return b.createdAt - a.createdAt;
                });

                setSpaceQuests(sortedQuests);
                console.log(`📋 Loaded ${sortedQuests.length} quests for space:`, space.name);
            } catch (error) {
                console.error('Error fetching space quests:', error);
                setSpaceQuests([]);
            } finally {
                setQuestsLoading(false);
            }
        };

        fetchSpaceQuests();
    }, [space.id, space.name, space.ownerAddress]);

    // Check if current user is the owner of this space or an admin
    const isOwner = address && space.ownerAddress && address.toLowerCase() === space.ownerAddress.toLowerCase();
    const canAccessBuilder = isOwner || isAdminLoggedIn;

    // Filter quests based on selected filter
    const filteredQuests = useMemo(() => {
        const now = Date.now();

        return spaceQuests.filter(quest => {
            switch (filterType) {
                case 'active':
                    return (!quest.expiresAt || quest.expiresAt > now) && quest.status === 'active';
                case 'ended':
                    return (quest.expiresAt && quest.expiresAt <= now) || quest.status !== 'active';
                case 'trust':
                    return (quest as any).trustReward && (quest as any).trustReward > 0;
                case 'iq':
                    return quest.xpReward && quest.xpReward > 0;
                default:
                    return true;
            }
        });
    }, [spaceQuests, filterType]);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.space-detail-filter-wrapper')) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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
                    {/* Integrated Back Button */}
                    <button className="space-detail-back-icon-btn" onClick={onBack} title="Go Back">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>

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
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
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
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </a>
                            )}
                            {canAccessBuilder && onBuilderAccess && (
                                <button
                                    className="space-detail-follow-button"
                                    onClick={() => onBuilderAccess(space.id)}
                                    title={isAdminLoggedIn && !isOwner ? "Admin: Access Space Dashboard" : "Space Dashboard"}
                                >
                                    {isAdminLoggedIn && !isOwner ? "Admin: Space Dashboard" : "Space Dashboard"}
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
                    {/* Top Row - Description and Stats side by side */}
                    <div className="space-detail-top-row">
                        {/* Description */}
                        <div className="space-detail-description-section">
                            <p className="space-detail-description-text">
                                {space.description}
                                {space.description && space.description.length > 200 && (
                                    <span className="space-detail-view-more"> View More</span>
                                )}
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="space-detail-stats-card">
                            <div className="space-detail-stat-item">
                                <div className="space-detail-stat-header">
                                    <span className="space-detail-stat-label">Followers</span>
                                </div>
                                <div className="space-detail-stat-value">{followerCount.toLocaleString()}</div>
                            </div>

                            {/* Mobile Follow Button - Inside Stats Card for alignment */}
                            <div className="space-detail-mobile-follow-wrapper">
                                {canAccessBuilder && onBuilderAccess && (
                                    <button
                                        className="space-detail-follow-button mobile-follow-btn"
                                        onClick={() => onBuilderAccess(space.id)}
                                        title={isAdminLoggedIn && !isOwner ? "Admin: Access Space Dashboard" : "Space Dashboard"}
                                    >
                                        {isAdminLoggedIn && !isOwner ? "Admin: Dashboard" : "Dashboard"}
                                    </button>
                                )}
                                {!isOwner && (
                                    <button
                                        className={`space-detail-follow-button mobile-follow-btn ${isFollowing ? 'following' : ''}`}
                                        onClick={handleFollow}
                                        disabled={isLoadingFollow}
                                    >
                                        {isLoadingFollow ? '...' : isFollowing ? 'Following' : '+ Follow'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter Button */}
                        <div className="space-detail-filter-wrapper">
                            <button
                                className={`space-detail-filter-button ${filterType !== 'all' ? 'active' : ''}`}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                title="Filter quests"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                {filterType !== 'all' && <span className="space-detail-filter-badge" />}
                            </button>
                            {isFilterOpen && (
                                <div className="space-detail-filter-dropdown">
                                    <button
                                        className={`space-detail-filter-option ${filterType === 'all' ? 'selected' : ''}`}
                                        onClick={() => { setFilterType('all'); setIsFilterOpen(false); }}
                                    >
                                        <span>All Quests</span>
                                        {filterType === 'all' && <span className="space-detail-filter-check">✓</span>}
                                    </button>
                                    <button
                                        className={`space-detail-filter-option ${filterType === 'active' ? 'selected' : ''}`}
                                        onClick={() => { setFilterType('active'); setIsFilterOpen(false); }}
                                    >
                                        <span>Active</span>
                                        {filterType === 'active' && <span className="space-detail-filter-check">✓</span>}
                                    </button>
                                    <button
                                        className={`space-detail-filter-option ${filterType === 'ended' ? 'selected' : ''}`}
                                        onClick={() => { setFilterType('ended'); setIsFilterOpen(false); }}
                                    >
                                        <span>Ended</span>
                                        {filterType === 'ended' && <span className="space-detail-filter-check">✓</span>}
                                    </button>
                                    <div className="space-detail-filter-divider" />
                                    <button
                                        className={`space-detail-filter-option ${filterType === 'trust' ? 'selected' : ''}`}
                                        onClick={() => { setFilterType('trust'); setIsFilterOpen(false); }}
                                    >
                                        <span>Trust Rewards</span>
                                        {filterType === 'trust' && <span className="space-detail-filter-check">✓</span>}
                                    </button>
                                    <button
                                        className={`space-detail-filter-option ${filterType === 'iq' ? 'selected' : ''}`}
                                        onClick={() => { setFilterType('iq'); setIsFilterOpen(false); }}
                                    >
                                        <span>IQ Rewards</span>
                                        {filterType === 'iq' && <span className="space-detail-filter-check">✓</span>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Quests Section - Full Width */}
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
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '16px' }}>
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    <path d="M9 14l2 2 4-4" />
                                </svg>
                                <p style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>No Active Quests</p>
                                <p style={{ margin: '8px 0 0', fontSize: '14px' }}>This space hasn't published any quests yet. Check back later!</p>
                            </div>
                        ) : filteredQuests.length === 0 ? (
                            <div className="space-detail-empty-quests">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '16px' }}>
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                <p style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>No Matching Quests</p>
                                <p style={{ margin: '8px 0 0', fontSize: '14px' }}>No quests match the selected filter. Try a different filter.</p>
                            </div>
                        ) : (
                            <div className="space-detail-quests-grid">
                                {filteredQuests.map((quest, index) => (
                                    <Reveal key={quest.id} delay={index * 50} width="100%">
                                        <CommunityQuestCard
                                            quest={quest}
                                            onClick={() => onQuestClick?.(quest.id)}
                                        />
                                    </Reveal>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Visuals Button (Admin Only) */}
            {isAdminLoggedIn && (
                <button
                    className="quest-detail-edit-button"
                    onClick={() => setShowEditVisuals(true)}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '20px',
                        padding: '12px 24px',
                        backgroundColor: '#8b5cf6', // Purple
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#7c3aed';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#8b5cf6';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Edit Visuals
                </button>
            )}

            {/* Edit Visuals Modal */}
            {showEditVisuals && (
                <EditSpaceVisualsModal
                    space={space}
                    onClose={() => setShowEditVisuals(false)}
                    onUpdate={(updatedSpace) => {
                        setSpace(updatedSpace);
                    }}
                />
            )}
        </>
    );
}
