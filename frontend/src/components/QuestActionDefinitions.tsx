import React from 'react';

export interface QuestActionDefinition {
    id: number;
    title: string;
    description: string;
    color: 'blue' | 'purple' | 'green' | 'red';
    icon: React.ReactNode;
    disabled?: boolean;
    proOnly?: boolean;
    comingSoon?: boolean;
    hoverKey?: string; // For tooltips
}

export const AVAILABLE_ACTIONS: QuestActionDefinition[] = [
    {
        id: 37,
        title: 'EVM wallet connected',
        description: 'Connect an EVM-compatible wallet',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
        )
    },
    {
        id: 29,
        title: 'Have an Intuition identity',
        description: 'Verify Intuition protocol identity',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        )
    },
    {
        id: 5,
        title: 'Discord connected',
        description: 'Connect a Discord account',
        color: 'purple',
        icon: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>@</span>
    },
    {
        id: 6,
        title: 'Email connected',
        description: 'Connect an email address',
        color: 'red',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
            </svg>
        )
    },
    {
        id: 7,
        title: 'Github connected',
        description: 'Connect a GitHub account',
        color: 'purple',
        icon: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>@</span>
    },
    {
        id: 9,
        title: 'Twitter connected',
        description: 'Connect a Twitter account',
        color: 'blue',
        icon: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>@</span>
    },
    {
        id: 10,
        title: 'Joined Discord Server',
        description: 'Grow your community',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        )
    },
    {
        id: 31,
        title: 'Follow a Twitter account',
        description: 'Follow a specific Twitter profile',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        )
    },
    {
        id: 32,
        title: 'Make a post on Twitter',
        description: 'Create and publish a Twitter post',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        )
    },
    {
        id: 33,
        title: 'Like a post on Twitter',
        description: 'Like a specific Twitter post',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        )
    },
    {
        id: 34,
        title: 'Comment on a post on Twitter',
        description: 'Add a comment to a Twitter post',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
    {
        id: 35,
        title: 'Repost a post on Twitter',
        description: 'Repost a Twitter post to your feed',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a2 2 0 0 1 2-2h16" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a2 2 0 0 1-2 2H3" />
            </svg>
        )
    },
    {
        id: 38,
        title: 'Quote a tweet on Twitter',
        description: 'Quote a specific tweet with your own comment',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M9 9h6" />
                <path d="M9 13h6" />
            </svg>
        )
    },
    {
        id: 36,
        title: 'Visit website',
        description: 'Visit a website URL',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
        )
    },
    {
        id: 30,
        title: 'Staked on a claim',
        description: 'Verify staking activity',
        color: 'blue',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
        )
    },
    // Disabled options
    {
        id: 9998,
        title: 'TNS minted',
        description: 'Trust Name Service',
        color: 'purple',
        disabled: true,
        comingSoon: true,
        hoverKey: 'tns',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
        )
    },
    {
        id: 9999,
        title: 'Gitcoin Passport Score',
        description: 'Apply extra sybil protection',
        color: 'blue',
        disabled: true,
        comingSoon: true,
        hoverKey: 'gitcoin',
        icon: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>G</span>
    },
    // Pro Actions
    {
        id: 13,
        title: 'Poll',
        description: 'Answer survey questions',
        color: 'purple',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
    {
        id: 14,
        title: 'Quiz',
        description: 'Test & verify knowledge',
        color: 'green',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
            </svg>
        )
    },
    {
        id: 16,
        title: 'Open Link',
        description: 'Visit an external link',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
        )
    },
    {
        id: 17,
        title: 'Quest Completion',
        description: 'Build progressive engagement',
        color: 'blue',
        proOnly: true,
        icon: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>Q</span>
    },
    {
        id: 18,
        title: 'Wait',
        description: 'Add a timed waiting period',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        )
    },
    {
        id: 19,
        title: 'Read docs',
        description: 'Require users to read documents',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
        )
    },
    {
        id: 20,
        title: 'Minted an NFT',
        description: 'Verify NFT minting activity',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
        )
    },
    {
        id: 21,
        title: 'Transfer tokens',
        description: 'Verify token movement',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
        )
    },
    {
        id: 23,
        title: 'Hold a token',
        description: 'Verify token ownership',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
        )
    },
    {
        id: 24,
        title: 'Hold an NFT',
        description: 'Enable holder-only benefits',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
        )
    },
    {
        id: 26,
        title: 'Bridge',
        description: 'Bridge tokens between chains',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
        )
    },
    {
        id: 27,
        title: 'Swap',
        description: 'Swap tokens',
        color: 'blue',
        proOnly: true,
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
        )
    }
];
