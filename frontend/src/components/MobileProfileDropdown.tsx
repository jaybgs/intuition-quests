import React, { useRef, useEffect } from 'react';
import { useBalance } from 'wagmi';
import './MobileProfileDropdown.css';

interface MobileProfileDropdownProps {
    address: string;
    isOpen: boolean;
    onClose: () => void;
    onDisconnect: () => void;
    onProfileClick: () => void;
    onBuilderProfileClick?: () => void;
    spaceName?: string;
}

export const MobileProfileDropdown: React.FC<MobileProfileDropdownProps> = ({
    address,
    isOpen,
    onClose,
    onDisconnect,
    onProfileClick,
    onBuilderProfileClick,
    spaceName
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data: balance } = useBalance({
        address: address as `0x${string}`,
    });

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                // Check if the click was on the trigger button (avatar) - if so, let the parent handle the toggle
                // We assume the parent (App.tsx) handles the trigger click separately
                // But for safety, we can just close it. 
                // Note: If the user clicks the avatar again, the parent might toggle (close -> open), 
                // overlapping with this close. Usually checking if target is the trigger helps.
                // For now, simple outside click is fine.
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Format balance for display
    const formatBalance = (value: bigint | undefined): string => {
        if (!value) return '0.00';
        const num = Number(value) / 1e18;
        return num >= 1 ? num.toFixed(2) : num.toFixed(4);
    };

    // Abbreviate space name if too long
    const abbreviateSpaceName = (name: string, maxLength: number = 20): string => {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 3) + '...';
    };

    if (!isOpen) return null;

    return (
        <div className="mobile-profile-dropdown-container" ref={dropdownRef}>
            <div className="mobile-profile-dropdown-menu">
                {/* TRUST Balance */}
                <div className="mobile-dropdown-balance-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4" />
                    </svg>
                    <span className="mobile-dropdown-balance-amount">{formatBalance(balance?.value)} TRUST</span>
                </div>

                <div className="mobile-dropdown-divider" />

                {/* My Profile */}
                <button onClick={() => { onProfileClick(); onClose(); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    My Profile
                </button>

                {/* Builder Dashboard */}
                {onBuilderProfileClick && (
                    <button onClick={() => { onBuilderProfileClick(); onClose(); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        {spaceName ? abbreviateSpaceName(spaceName) : 'Space Dashboard'}
                    </button>
                )}

                {/* Disconnect */}
                <button onClick={() => { onDisconnect(); onClose(); }} className="mobile-disconnect-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Disconnect
                </button>
            </div>
        </div>
    );
};
