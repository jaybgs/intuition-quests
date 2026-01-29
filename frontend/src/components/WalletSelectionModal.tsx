
import React, { useEffect, useRef } from 'react';
import { useConnect } from 'wagmi';
import { createPortal } from 'react-dom';
import './WalletSelectionModal.css';

interface WalletSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({ isOpen, onClose }) => {
    const { connectors, connect, isPending } = useConnect();
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Filter valid connectors and deduplicate
    const uniqueConnectors = connectors.filter((connector, index, self) =>
        index === self.findIndex((t) => t.id === connector.id)
    );

    const getWalletIcon = (id: string, name: string) => {
        const lowerId = id.toLowerCase();
        const lowerName = name.toLowerCase();

        if (lowerId.includes('metamask') || lowerName.includes('metamask')) {
            return '/metamask.svg';
        }
        if (lowerId.includes('coinbase') || lowerName.includes('coinbase')) {
            return '/coinbase.svg';
        }
        if (lowerId.includes('walletconnect') || lowerName.includes('walletconnect')) {
            return '/walletconnect.svg';
        }
        // Default generic wallet icon
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTJWMhhjMCAxLjEtLjkgMi0yIDJINmMtMS4xIDAtMi0uOS0yLTJ2LTZINGEyIDIgMCAwIDEgMi0yaDE2bC0zLTZINlY1YzAtMS4xLjktMiAyLTJ6Ii8+PHBhdGggZD0iTTEyIDEyVjZoNCIvPjwvc3ZnPg==';
    };

    const handleConnect = (connector: any) => {
        connect({ connector });
        onClose();
    };

    return createPortal(
        <div className="wallet-modal-overlay">
            <div className="wallet-modal-container" ref={modalRef}>
                <div className="wallet-modal-header">
                    <h2>Connect Wallet</h2>
                    <button className="wallet-modal-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <p className="wallet-modal-subtitle">
                    Choose a wallet to connect to Intuition Quests
                </p>

                <div className="wallet-grid">
                    {uniqueConnectors.map((connector) => (
                        <button
                            key={connector.uid || connector.id}
                            className="wallet-option"
                            onClick={() => handleConnect(connector)}
                            disabled={isPending}
                        >
                            <div className="wallet-icon-wrapper">
                                <img
                                    src={getWalletIcon(connector.id, connector.name)}
                                    alt={connector.name}
                                    className="wallet-icon"
                                />
                            </div>
                            <span className="wallet-name">{connector.name}</span>
                            {isPending && <span className="wallet-connecting">Connecting...</span>}
                        </button>
                    ))}

                    {uniqueConnectors.length === 0 && (
                        <div className="no-wallets-message">
                            No wallets found. Please install MetaMask or another Web3 wallet extension.
                        </div>
                    )}
                </div>

                <div className="wallet-modal-footer">
                    New to Web3? <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">Learn about wallets</a>
                </div>
            </div>
        </div>,
        document.body
    );
};
