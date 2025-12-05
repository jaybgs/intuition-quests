import { useState, useEffect, useRef, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { QuestList } from './components/QuestList';
import { Leaderboard } from './components/Leaderboard';
import { CreateQuest } from './components/CreateQuest';
import { UserProfile } from './components/UserProfile';
import { ProjectSlideshow } from './components/ProjectSlideshow';
import { UserDashboard } from './components/UserDashboard';
import { EditProfile } from './components/EditProfile';
import { SignupModal } from './components/SignupModal';
import { OnboardingSetup } from './components/OnboardingSetup';
import { ToastContainer, showToast } from './components/Toast';
import { Search } from './components/Search';
import { Community } from './components/Community';
import { AllQuests } from './components/AllQuests';
import { Rewards } from './components/Rewards';
import { QuestDetail } from './components/QuestDetail';
import { Bounties } from './components/Bounties';
import { Raids } from './components/Raids';
import { OAuthCallback } from './components/OAuthCallback';
import { SpaceBuilder } from './components/SpaceBuilder';
import { SpaceDetailView } from './components/SpaceDetailView';
import { BuilderDashboard } from './components/BuilderDashboard';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminLogin } from './components/AdminLogin';
import { spaceService } from './services/spaceService';
import type { Space } from './types';
import { useTrustBalance } from './hooks/useTrustBalance';
import { useAuth } from './hooks/useAuth';
import { useAdmin } from './hooks/useAdmin';
import { wagmiConfig } from './config/wagmi';
import './App.css';

const queryClient = new QueryClient();

// Suppress wallet extension conflicts - these are browser-level issues that can't be fixed from app code
// Multiple wallet extensions (MetaMask, Zerion, etc.) compete for window.ethereum
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Filter console.error
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Filter out wallet extension conflicts
    if (
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot redefine property: isZerion') ||
      message.includes('Failed to set window.ethereum') ||
      message.includes('MetaMask encountered an error setting the global Ethereum provider') ||
      message.includes('Cannot set property ethereum of #<Window>') ||
      message.includes('which has only a getter') ||
      message.includes('Receiving end does not exist') ||
      message.includes('Unchecked runtime.lastError')
    ) {
      // Silently ignore wallet extension conflicts
      return;
    }
    originalError.apply(console, args);
  };

  // Filter console.warn for similar issues
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('Cannot redefine property: isZerion') ||
      message.includes('Failed to set window.ethereum') ||
      message.includes('MetaMask encountered an error') ||
      message.includes('Receiving end does not exist') ||
      message.includes('runtime.lastError')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Also catch unhandled promise rejections from wallet extensions
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || '';
    if (
      message.includes('Cannot redefine property') ||
      message.includes('window.ethereum') ||
      message.includes('isZerion') ||
      message.includes('Receiving end does not exist')
    ) {
      event.preventDefault();
      return;
    }
  });
}

// Trust Token Contract Address
const TRUST_TOKEN_ADDRESS = '0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3' as const;

// Profile Dropdown Component
// Helper function to get profile picture from localStorage
const getStoredProfilePic = (address: string | undefined): string | null => {
  if (!address || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const stored = localStorage.getItem(`profilePic_${address.toLowerCase()}`);
    return stored ? stored : null; // Profile pic is stored as data URL string
  } catch {
    return null;
  }
};

function ProfileDropdown({ address, onDisconnect, onProfileClick, onBuilderProfileClick }: { 
  address: string | undefined; 
  onDisconnect: () => void;
  onProfileClick: () => void;
  onBuilderProfileClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { balance, isLoading, contractNotDeployed, isUsingNativeBalance } = useTrustBalance();
  const profilePicture = getStoredProfilePic(address);
  const [hasSpaces, setHasSpaces] = useState(false);

  // Check if user has created any spaces
  const checkSpaces = useCallback(() => {
    if (address) {
      try {
        const userSpaces = spaceService.getSpacesByOwner(address);
        setHasSpaces(userSpaces.length > 0);
      } catch (error) {
        console.error('Error checking user spaces:', error);
        setHasSpaces(false);
      }
    } else {
      setHasSpaces(false);
    }
  }, [address]);

  useEffect(() => {
    checkSpaces();
  }, [checkSpaces]);

  // Listen for space creation and deletion events
  useEffect(() => {
    const handleSpaceCreated = (event: CustomEvent) => {
      // Only update if the created space belongs to the current user
      if (address && event.detail?.ownerAddress?.toLowerCase() === address.toLowerCase()) {
        checkSpaces();
      }
    };

    const handleSpaceDeleted = (event: CustomEvent) => {
      // Only update if the deleted space belongs to the current user
      if (address && event.detail?.ownerAddress?.toLowerCase() === address.toLowerCase()) {
        checkSpaces();
      }
    };

    window.addEventListener('spaceCreated', handleSpaceCreated as EventListener);
    window.addEventListener('spaceDeleted', handleSpaceDeleted as EventListener);
    return () => {
      window.removeEventListener('spaceCreated', handleSpaceCreated as EventListener);
      window.removeEventListener('spaceDeleted', handleSpaceDeleted as EventListener);
    };
  }, [address, checkSpaces]);

  if (!address) return null;

  const displayAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div className="profile-dropdown-container">
      <div className="trust-balance-display">
        {contractNotDeployed ? (
          <div className="trust-balance" title="TRUST token contract not deployed yet. Showing native balance if available.">
            {isUsingNativeBalance ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trust-icon">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <span className="trust-balance-value">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="trust-balance-label">Trust</span>
              </>
            ) : (
              <span className="trust-balance-value" style={{ opacity: 0.5 }}>N/A</span>
            )}
          </div>
        ) : isLoading ? (
          <span className="trust-balance-loading">...</span>
        ) : (
          <div className="trust-balance">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trust-icon">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span className="trust-balance-value">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="trust-balance-label">Trust</span>
          </div>
        )}
      </div>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="profile-icon-button"
        aria-label="User Profile"
      >
        {profilePicture ? (
          <img 
            src={profilePicture} 
            alt="Profile" 
            style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              objectFit: 'cover' 
            }} 
          />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        )}
      </button>
      {isOpen && (
        <>
          <div className="profile-dropdown-overlay" onClick={() => setIsOpen(false)}></div>
          <div className="profile-dropdown">
            <div className="profile-dropdown-address">
              {displayAddress}
            </div>
            <button 
              className="profile-dropdown-item"
              onClick={() => {
                setIsOpen(false);
                onProfileClick();
              }}
            >
              My Profile
            </button>
            {hasSpaces && onBuilderProfileClick && (
              <button 
                className="profile-dropdown-item"
                onClick={() => {
                  setIsOpen(false);
                  onBuilderProfileClick();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                Builder's Profile
              </button>
            )}
            <button 
              className="profile-dropdown-item profile-dropdown-disconnect"
              onClick={() => {
                setIsOpen(false);
                onDisconnect();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Login/Connect Button Component
function LoginButton({ onProfileClick, onBuilderProfileClick }: { onProfileClick: () => void; onBuilderProfileClick?: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { authenticate, isAuthenticating } = useAuth();

  // Auto-authenticate when wallet is connected
  useEffect(() => {
    if (isConnected && address && !isAuthenticating) {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        authenticate().catch(console.error);
      }
    }
  }, [isConnected, address, isAuthenticating, authenticate]);

  // Auto-switch to Intuition network if connected to wrong chain
  useEffect(() => {
    if (isConnected && chainId && chainId !== 1155 && switchChain) {
      // Show toast and attempt to switch
      showToast('Please switch to Intuition Network', 'warning');
      try {
        switchChain({ chainId: 1155 });
      } catch (error) {
        console.error('Error switching network:', error);
      }
    }
  }, [isConnected, chainId, switchChain]);

  // Show connection errors
  useEffect(() => {
    if (connectError) {
      console.error('Wallet connection error:', connectError);
      if (connectError.message?.includes('User rejected')) {
        showToast('Connection was rejected', 'warning');
      } else {
        showToast('Failed to connect wallet. Please try again.', 'error');
      }
    }
  }, [connectError]);

  const handleDisconnect = () => {
    // Disconnect wallet
    disconnect();
    
    // Clear authentication token
    localStorage.removeItem('auth_token');
    
    // Clear any user-specific cached data
    if (address) {
      localStorage.removeItem(`staked_amount_${address.toLowerCase()}`);
      localStorage.removeItem(`intuition_identity_${address.toLowerCase()}`);
      localStorage.removeItem(`verification_attempts_${address.toLowerCase()}`);
    }
    
    // Show success notification
    showToast('Wallet disconnected successfully', 'success');
  };

  if (isConnected && address) {
    // Show network switch button if on wrong chain
    if (chainId && chainId !== 1155) {
      return (
        <button 
          onClick={() => switchChain?.({ chainId: 1155 })}
          className="login-button"
          style={{ background: '#ef4444' }}
        >
          Switch to Intuition Network
        </button>
      );
    }

    return (
      <ProfileDropdown 
        address={address}
        onDisconnect={handleDisconnect}
        onProfileClick={onProfileClick}
        onBuilderProfileClick={onBuilderProfileClick}
      />
    );
  }

  const handleConnect = async () => {
    if (!connectors || connectors.length === 0) {
      showToast('No wallet connectors available. Please install a wallet extension.', 'error');
      return;
    }

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
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      if (error?.message?.includes('User rejected')) {
        showToast('Connection was rejected', 'warning');
      } else {
        showToast('Failed to connect wallet: ' + (error?.message || 'Unknown error'), 'error');
      }
    }
  };

  return (
    <button 
      onClick={handleConnect} 
      className="login-button"
      disabled={isPending}
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<'quests' | 'leaderboard' | 'create' | 'profile' | 'discover' | 'community' | 'rewards' | 'bounties' | 'raids' | 'dashboard' | 'edit-profile' | 'full-leaderboard' | 'quest-detail' | 'space-builder' | 'space-detail' | 'builder-dashboard' | 'all-quests'>('discover');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pendingSpaceCreation, setPendingSpaceCreation] = useState<(() => void) | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { isAuthenticated: isAdminAuthenticated, adminRole, logout: adminLogout } = useAdmin();
  const navRef = useRef<HTMLElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Hidden admin login/logout via keyboard shortcut (Ctrl+Shift+A or Cmd+Shift+A on Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (isAdminAuthenticated) {
          // If already logged in, logout
          adminLogout();
          showToast('Admin logged out', 'success');
        } else {
          // If not logged in, show login modal
          setShowAdminLogin(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminAuthenticated, adminLogout]);

  // Tab mapping for active tab index
  const tabMap: Record<string, number> = {
    'discover': 0,
    'community': 1,
    'rewards': 2,
    'bounties': 3,
    'raids': 4,
  };

  // Get the index of the active tab
  const getActiveTabIndex = (): number => {
    return tabMap[activeTab] ?? 0;
  };

  // Update slider position to active tab
  const updateSliderToActiveTab = useCallback(() => {
    if (!navRef.current || !sliderRef.current) return;
    
    const activeIndex = getActiveTabIndex();
    const activeItem = itemRefs.current[activeIndex];
    
    if (activeItem) {
      const nav = navRef.current;
      const slider = sliderRef.current;
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      slider.style.left = `${itemRect.left - navRect.left}px`;
      slider.style.width = `${itemRect.width}px`;
      slider.style.opacity = '1';
    }
  }, [activeTab]);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Initialize slider position on mount and when activeTab changes
  useEffect(() => {
    // Small delay to ensure refs are set
    const timer = setTimeout(() => {
      if (hoveredIndex === null) {
        updateSliderToActiveTab();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeTab, hoveredIndex, updateSliderToActiveTab]);

  // Also update when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSliderToActiveTab();
    }, 100);
    return () => clearTimeout(timer);
  }, [updateSliderToActiveTab]);

  // Check if user needs onboarding
  useEffect(() => {
    if (isConnected && address) {
      const isNewUser = localStorage.getItem('isNewUser') === 'true';
      const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';
      
      // Close signup modal when connected
      setShowSignupModal(false);
      
      if (isNewUser && !onboardingComplete) {
        setShowOnboarding(true);
      }
    }
  }, [isConnected, address]);

  const menuItems = [
    { 
      label: 'Discover & Earn',
      tab: 'discover',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      )
    },
    { 
      label: 'Community',
      tab: 'community',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    { 
      label: 'Rewards',
      tab: 'rewards',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7"/>
          <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>
        </svg>
      )
    },
    { 
      label: 'Bounties',
      tab: 'bounties',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      )
    },
    { 
      label: 'Raids',
      tab: 'raids',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
          <path d="M17 8V20m0 0l4-4m-4 4l-4-4"/>
        </svg>
      )
    }
  ];

  return (
    <div className="app">
      <div className="app-content-wrapper">
      <header className="app-header">
        <div className="header-left">
          <a href="/" className="logo">
            <img src="/logo.svg" alt="TrustQuests Logo" className="logo-icon" />
          </a>
          <nav 
            className="header-nav" 
            ref={navRef}
            onMouseLeave={() => {
              setHoveredIndex(null);
              // Return slider to active tab position when leaving nav area
              updateSliderToActiveTab();
            }}
          >
            <div className="header-nav-slider" ref={sliderRef} />
            {menuItems.map((item, index) => (
              <a
                key={index}
                href="#"
                className="header-nav-item"
                ref={(el) => { itemRefs.current[index] = el; }}
                onMouseEnter={() => {
                  setHoveredIndex(index);
                  if (itemRefs.current[index] && sliderRef.current && navRef.current) {
                    const item = itemRefs.current[index];
                    const nav = navRef.current;
                    const slider = sliderRef.current;
                    const navRect = nav.getBoundingClientRect();
                    const itemRect = item.getBoundingClientRect();
                    slider.style.left = `${itemRect.left - navRect.left}px`;
                    slider.style.width = `${itemRect.width}px`;
                    slider.style.opacity = '1';
                  }
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  // Return slider to active tab position
                  updateSliderToActiveTab();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(item.tab as any);
                }}
              >
                <span className="header-nav-text">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="header-center">
          <Search 
            placeholder="Search quests, projects, spaces..." 
            onSpaceSelect={(space) => {
              setSelectedSpace(space);
              setActiveTab('space-detail');
            }}
            isAdmin={isAdminAuthenticated}
            onBuilderAccess={(space) => {
              setSelectedSpaceId(space.id);
              setActiveTab('builder-dashboard');
            }}
          />
        </div>
        <div className="header-right">
          {isAdminAuthenticated && (
            <button
              onClick={() => {
                adminLogout();
                showToast('Admin logged out', 'success');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginRight: '12px',
                padding: '6px 12px',
                background: 'rgba(102, 126, 234, 0.15)',
                border: '1px solid rgba(102, 126, 234, 0.4)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#818cf8',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.6)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title={`Admin: ${adminRole} (Click to logout or press Ctrl+Shift+A)`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <span>{adminRole?.toUpperCase()}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
          {isConnected && address ? (
            <LoginButton 
              onProfileClick={() => setActiveTab('dashboard')}
              onBuilderProfileClick={() => {
                // Get user's first space and navigate to builder dashboard
                if (address) {
                  const userSpaces = spaceService.getSpacesByOwner(address);
                  if (userSpaces.length > 0) {
                    setSelectedSpaceId(userSpaces[0].id);
                    setActiveTab('builder-dashboard');
                  }
                }
              }}
            />
          ) : (
            <div 
              style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
              data-testid="auth-buttons-container"
            >
              <button 
                className="login-button" 
                onClick={() => setShowSignupModal(true)}
                data-testid="login-button"
              >
                Connect Wallet
              </button>
              <button 
                className="signup-button" 
                onClick={() => {
                  setShowSignupModal(true);
                }}
                aria-label="Sign Up"
                data-testid="signup-button"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="app-main">
        {/* OAuth Callback Handler - Check URL path first (before other content) */}
        {(window.location.pathname.includes('/oauth/twitter/callback') ||
          window.location.pathname.includes('/oauth/discord/callback') ||
          window.location.pathname.includes('/oauth/github/callback') ||
          window.location.pathname.includes('/oauth/google/callback')) ? (
          <OAuthCallback />
        ) : showOnboarding ? (
          <OnboardingSetup onComplete={() => {
            setShowOnboarding(false);
            setActiveTab('discover');
          }} />
        ) : (
          <>
            {activeTab === 'quests' && (
              <QuestList 
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  setActiveTab('quest-detail');
                }}
              />
            )}
            {activeTab === 'discover' && (
              <ProjectSlideshow 
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  setActiveTab('quest-detail');
                }}
                onCreateSpace={() => {
                  // Check if user already has a space
                  if (address) {
                    const existingSpaces = spaceService.getSpacesByOwner(address);
                    if (existingSpaces.length > 0) {
                      showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                      setSelectedSpaceId(existingSpaces[0].id);
                      setActiveTab('builder-dashboard');
                      return;
                    }
                  }
                  localStorage.setItem('spaceBuilderSource', 'discover');
                  localStorage.setItem('previousTab', 'discover');
                  setPendingSpaceCreation(() => () => {
                  setActiveTab('space-builder');
                  });
                  setShowSubscriptionModal(true);
                }}
                onSpaceClick={(spaceId) => {
                  const space = spaceService.getSpaceById(spaceId);
                  if (space) {
                    setSelectedSpace(space);
                    setActiveTab('space-detail');
                  }
                }}
              />
            )}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'create' && <CreateQuest />}
            {activeTab === 'profile' && <UserProfile />}
            {activeTab === 'dashboard' && <UserDashboard onEditProfile={() => setActiveTab('edit-profile')} />}
            {activeTab === 'edit-profile' && <EditProfile onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'community' && (
              <Community 
                onSeeMoreLeaderboard={() => setActiveTab('full-leaderboard')}
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  setActiveTab('quest-detail');
                }}
                onCreateSpace={() => {
                  // Check if user already has a space
                  if (address) {
                    const existingSpaces = spaceService.getSpacesByOwner(address);
                    if (existingSpaces.length > 0) {
                      showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                      setSelectedSpaceId(existingSpaces[0].id);
                      setActiveTab('builder-dashboard');
                      return;
                    }
                  }
                  localStorage.setItem('spaceBuilderSource', 'community');
                  localStorage.setItem('previousTab', 'community');
                  setPendingSpaceCreation(() => () => {
                  setActiveTab('space-builder');
                  });
                  setShowSubscriptionModal(true);
                }}
                onSeeMoreQuests={() => setActiveTab('all-quests')}
              />
            )}
            {activeTab === 'all-quests' && (
              <AllQuests
                onBack={() => setActiveTab('community')}
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  setActiveTab('quest-detail');
                }}
              />
            )}
            {activeTab === 'space-builder' && (
              <SpaceBuilder 
                onBack={() => {
                  // Go back to the previous tab (discover or community)
                  const previousTab = localStorage.getItem('previousTab') || 'community';
                  setActiveTab(previousTab as any);
                }}
                onSpaceCreated={(spaceId) => {
                  setSelectedSpaceId(spaceId);
                  setActiveTab('builder-dashboard');
                }}
                defaultUserType={localStorage.getItem('spaceBuilderSource') === 'community' ? 'user' : 'project'}
              />
            )}
            {activeTab === 'builder-dashboard' && selectedSpaceId && (
              <BuilderDashboard 
                spaceId={selectedSpaceId}
                onBack={() => setActiveTab('community')}
              />
            )}
            {activeTab === 'space-detail' && selectedSpace && (
              <SpaceDetailView 
                space={selectedSpace}
                onBack={() => {
                  setActiveTab('community');
                  setSelectedSpace(null);
                }}
              />
            )}
            {activeTab === 'rewards' && <Rewards />}
            {activeTab === 'bounties' && <Bounties />}
            {activeTab === 'raids' && <Raids />}
            {activeTab === 'quest-detail' && selectedQuestId && (
              <QuestDetail 
                questId={selectedQuestId} 
                onBack={() => {
                  setActiveTab('community');
                  setSelectedQuestId(null);
                }}
                onNavigateToProfile={() => {
                  setActiveTab('dashboard');
                  setSelectedQuestId(null);
                }}
              />
            )}
          </>
        )}
      </main>
      <SignupModal 
        isOpen={showSignupModal}
        onClose={() => {
          // Only close if not connected (user might have connected)
          if (!isConnected) {
            setShowSignupModal(false);
          }
        }}
        onSignupComplete={() => {
          // Don't close modal immediately - let useEffect handle onboarding
          // The modal will close when user becomes connected and onboarding shows
        }}
      />
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          setPendingSpaceCreation(null);
        }}
        onProceed={(tier) => {
          setShowSubscriptionModal(false);
          // Double-check that user doesn't already have a space before proceeding
          if (address) {
            const existingSpaces = spaceService.getSpacesByOwner(address);
            if (existingSpaces.length > 0) {
              showToast('You can only create one space. Redirecting to your existing space...', 'warning');
              setSelectedSpaceId(existingSpaces[0].id);
              setActiveTab('builder-dashboard');
              setPendingSpaceCreation(null);
              return;
            }
          }
          if (pendingSpaceCreation) {
            pendingSpaceCreation();
            setPendingSpaceCreation(null);
          }
        }}
      />
      {showAdminLogin && (
        <AdminLogin
          onSuccess={() => {
            setShowAdminLogin(false);
            showToast('Admin access granted', 'success');
          }}
          onCancel={() => setShowAdminLogin(false)}
        />
      )}
      <ToastContainer />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AppContent />
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;
export { TRUST_TOKEN_ADDRESS };
