import { useState, useEffect } from 'react';
import { useConnect, useAccount, useSwitchChain } from 'wagmi';
import { useAuth } from '../hooks/useAuth';
import { showToast } from './Toast';
import './SignupModal.css';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupComplete: () => void;
}

export function SignupModal({ isOpen, onClose, onSignupComplete }: SignupModalProps) {
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { authenticate, isAuthenticating } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-switch to Intuition network if connected to wrong chain
  useEffect(() => {
    if (isConnected && chainId && chainId !== 1155 && switchChain) {
      showToast('Switching to Intuition Network...', 'info');
      try {
        switchChain({ chainId: 1155 });
      } catch (error) {
        console.error('Error switching network:', error);
        showToast('Please manually switch to Intuition Network in your wallet', 'warning');
      }
    }
  }, [isConnected, chainId, switchChain]);

  // Show connection errors
  useEffect(() => {
    if (connectError) {
      console.error('Wallet connection error:', connectError);
      setIsProcessing(false);
      if (connectError.message?.includes('User rejected')) {
        showToast('Connection was rejected', 'warning');
      } else {
        showToast('Failed to connect wallet. Please try again.', 'error');
      }
    }
  }, [connectError]);

  // Watch for wallet connection to complete
  useEffect(() => {
    if (isConnected && address && isOpen && chainId === 1155) {
      localStorage.setItem('isNewUser', 'true');
      setIsProcessing(false);
      
      // Auto-authenticate with backend
      authenticate().then(() => {
        onSignupComplete();
      }).catch(console.error);
    }
  }, [isConnected, address, chainId, isOpen, authenticate, onSignupComplete]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleWalletConnect = async () => {
    if (!connectors || connectors.length === 0) {
      showToast('No wallet connectors available. Please install a wallet extension.', 'error');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Prefer MetaMask or injected, fallback to first available
      const connector = connectors.find(c => 
        c.id === 'io.metamask' || 
        c.id === 'metaMask' ||
        c.id === 'injected'
      ) || connectors[0];
      
      if (connector) {
        await connect({ connector });
        showToast('Connecting wallet...', 'info');
      } else {
        showToast('No wallet found. Please install MetaMask or another wallet.', 'error');
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setIsProcessing(false);
      if (error?.message?.includes('User rejected')) {
        showToast('Connection was rejected', 'warning');
      } else {
        showToast('Failed to connect wallet: ' + (error?.message || 'Unknown error'), 'error');
      }
    }
  };

  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    <div className="signup-modal-overlay" onClick={onClose}>
      <div className="signup-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="signup-modal-close" onClick={onClose}>×</button>
        <h2 className="signup-modal-title">Connect Your Wallet</h2>
        <p className="signup-modal-subtitle">Choose a wallet to get started</p>
        
        <div className="signup-options">
          {connectors && connectors.length > 0 ? (
            connectors.map((connector) => (
              <button 
                key={connector.id}
                className="signup-option-button"
                onClick={() => connect({ connector })}
                disabled={isPending || isProcessing}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span>{connector.name}</span>
              </button>
            ))
          ) : (
            <button 
              className="signup-option-button"
              onClick={handleWalletConnect}
              disabled={isPending || isProcessing}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <span>{isPending || isProcessing ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>

        <div className="signup-modal-footer">
          <p>Already have an account? <button className="signup-modal-link" onClick={onClose}>Login</button></p>
        </div>
      </div>
    </div>
  );
}
