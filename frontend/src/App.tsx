import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { QuestServiceBackend } from './services/questServiceBackend';

const questServiceBackend = new QuestServiceBackend();
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
  if (!address) return null;
  try {
    const stored = localStorage.getItem(`user_profile_${address.toLowerCase()}`);
    if (stored) {
      const profile = JSON.parse(stored);
      return profile.profilePic || null;
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
};

// Helper function to get username from localStorage
const getStoredUsername = (address: string | undefined): string | null => {
  if (!address) return null;
  try {
    const stored = localStorage.getItem(`user_profile_${address.toLowerCase()}`);
    if (stored) {
      const profile = JSON.parse(stored);
      return profile.username || null;
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
};

interface ProfileDropdownProps {
  address: string;
  onDisconnect: () => void;
  onProfileClick: () => void;
  onBuilderProfileClick?: () => void;
}

function ProfileDropdown({ address, onDisconnect, onProfileClick, onBuilderProfileClick }: ProfileDropdownProps) {
  const profilePic = getStoredProfilePic(address);
  const username = getStoredUsername(address);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile menu"
      >
        {profilePic ? (
          <img src={profilePic} alt="Profile" className="profile-pic" />
        ) : (
          <div className="profile-pic-placeholder">
            {username ? username.charAt(0).toUpperCase() : address.slice(2, 4).toUpperCase()}
          </div>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {isOpen && (
        <div className="profile-dropdown-menu">
          <button onClick={() => { onProfileClick(); setIsOpen(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            My Profile
          </button>
          {onBuilderProfileClick && (
            <button onClick={() => { onBuilderProfileClick(); setIsOpen(false); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Builder Dashboard
            </button>
          )}
          <button onClick={() => { onDisconnect(); setIsOpen(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function LoginButton({ onProfileClick, onBuilderProfileClick }: { onProfileClick: () => void; onBuilderProfileClick?: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (connectError) {
      const message = connectError.message;
      if (
        !message.includes('User rejected') &&
        !message.includes('user rejected') &&
        !message.includes('User denied') &&
        !message.includes('user denied')
      ) {
        showToast(`Connection error: ${message}`, 'error');
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
      await connect({ connector: connectors[0] });
    } catch (error: any) {
      // User rejection is handled silently
      if (!error?.message?.includes('rejected') && !error?.message?.includes('denied')) {
        console.error('Connection error:', error);
      }
    }
  };

  return (
    <button 
      className="login-button" 
      onClick={handleConnect}
      disabled={isPending}
      aria-label="Connect Wallet"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

interface AppContentProps {
  initialTab?: string;
  questName?: string | null;
  spaceName?: string | null;
}

function AppContent({ initialTab = 'discover', questName = null, spaceName = null }: AppContentProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'quests' | 'leaderboard' | 'create' | 'profile' | 'discover' | 'community' | 'rewards' | 'bounties' | 'raids' | 'dashboard' | 'edit-profile' | 'full-leaderboard' | 'quest-detail' | 'space-builder' | 'space-detail' | 'builder-dashboard' | 'all-quests'>(initialTab as any);
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

  // Sync activeTab with initialTab prop (for routing)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  // Handle quest name from URL
  useEffect(() => {
    if (questName && activeTab === 'quest-detail') {
      // Find quest by name and set selectedQuestId
      const findQuestByName = async () => {
        try {
          const quests = await questServiceBackend.getAllQuests();
          const normalizedQuestName = questName.toLowerCase().replace(/-/g, ' ');
          const quest = quests.find(q => {
            const normalizedTitle = q.title.toLowerCase();
            const slugifiedTitle = createSlug(q.title);
            return (
              normalizedTitle === normalizedQuestName ||
              slugifiedTitle === questName.toLowerCase() ||
              q.id === questName ||
              q.id.toLowerCase() === questName.toLowerCase()
            );
          });
          if (quest) {
            setSelectedQuestId(quest.id);
          } else {
            console.warn('Quest not found:', questName);
          }
        } catch (error) {
          console.error('Error finding quest:', error);
        }
      };
      findQuestByName();
    }
  }, [questName, activeTab]);

  // Handle space name from URL
  useEffect(() => {
    if (spaceName && activeTab === 'space-detail') {
      // Find space by name and set selectedSpace
      const findSpaceByName = async () => {
        try {
          const spaces = await spaceService.getAllSpaces();
          const normalizedSpaceName = spaceName.toLowerCase().replace(/-/g, ' ');
          const space = spaces.find((s: Space) => {
            const normalizedName = s.name.toLowerCase();
            const slugifiedName = createSlug(s.name);
            return (
              s.slug === spaceName.toLowerCase() ||
              normalizedName === normalizedSpaceName ||
              slugifiedName === spaceName.toLowerCase() ||
              s.id === spaceName ||
              s.id.toLowerCase() === spaceName.toLowerCase()
            );
          });
          if (space) {
            setSelectedSpace(space);
          } else {
            console.warn('Space not found:', spaceName);
          }
        } catch (error) {
          console.error('Error finding space:', error);
        }
      };
      findSpaceByName();
    }
  }, [spaceName, activeTab]);

  // Helper function to create URL-friendly slug from name
  const createSlug = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Navigation helper
  const navigateToTab = (tab: string, params?: { questId?: string; questName?: string; spaceId?: string; spaceName?: string }) => {
    const routeMap: Record<string, string> = {
      'discover': '/home',
      'community': '/community',
      'rewards': '/rewards',
      'bounties': '/bounties',
      'raids': '/raids',
      'dashboard': '/dashboard',
      'builder-dashboard': '/builder-dashboard',
      'space-builder': '/create-space',
      'create': '/create-quest',
    };

    if (params?.questName) {
      navigate(`/quest-${createSlug(params.questName)}`);
    } else if (params?.questId) {
      // Try to get quest name first
      questServiceBackend.getQuestById(params.questId).then(quest => {
        if (quest) {
          navigate(`/quest-${createSlug(quest.title)}`);
        } else {
          navigate(`/quest-${params.questId}`);
        }
      }).catch(() => {
        navigate(`/quest-${params.questId}`);
      });
    } else if (params?.spaceName) {
      navigate(`/space-${createSlug(params.spaceName)}`);
    } else if (params?.spaceId) {
      // Try to get space name first
      spaceService.getSpaceById(params.spaceId).then(space => {
        if (space) {
          navigate(`/space-${createSlug(space.name)}`);
        } else {
          navigate(`/space-${params.spaceId}`);
        }
      }).catch(() => {
        navigate(`/space-${params.spaceId}`);
      });
      return;
    } else if (routeMap[tab]) {
      navigate(routeMap[tab]);
    } else {
      setActiveTab(tab as any);
    }
  };

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
      path: '/home',
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
      path: '/community',
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
      path: '/rewards',
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
      path: '/bounties',
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
      path: '/raids',
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
          <Link to="/home" className="logo">
            <img src="/logo.svg" alt="TrustQuests Logo" className="logo-icon" />
          </Link>
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
              <Link
                key={index}
                to={item.path}
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
                onClick={(e) => {
                  e.preventDefault();
                  navigateToTab(item.tab);
                }}
              >
                <span className="header-nav-text">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="header-center">
          <Search 
            placeholder="Search quests, projects, spaces..." 
            onSpaceSelect={(space) => {
              setSelectedSpace(space);
              navigateToTab('space-detail', { spaceId: space.id, spaceName: space.name });
            }}
            isAdmin={isAdminAuthenticated}
            onBuilderAccess={(space) => {
              setSelectedSpaceId(space.id);
              navigateToTab('builder-dashboard');
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
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Admin Logout
            </button>
          )}
          <LoginButton 
            onProfileClick={() => navigateToTab('dashboard')}
            onBuilderProfileClick={() => navigateToTab('builder-dashboard')}
          />
          {!isConnected && (
            <div className="header-right">
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
            navigateToTab('discover');
          }} />
        ) : (
          <>
            {activeTab === 'quests' && (
              <QuestList 
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
              />
            )}
            {activeTab === 'discover' && (
              <ProjectSlideshow 
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
                onCreateSpace={() => {
                  // Check if user already has a space
                  if (address) {
                    spaceService.getSpacesByOwner(address).then(existingSpaces => {
                      if (existingSpaces.length > 0) {
                        showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                        setSelectedSpaceId(existingSpaces[0].id);
                        navigateToTab('builder-dashboard');
                        return;
                      }
                    });
                  }
                  localStorage.setItem('spaceBuilderSource', 'discover');
                  localStorage.setItem('previousTab', 'discover');
                  setPendingSpaceCreation(() => () => {
                    navigateToTab('space-builder');
                  });
                  setShowSubscriptionModal(true);
                }}
                onSpaceClick={async (spaceId) => {
                  const space = await spaceService.getSpaceById(spaceId);
                  if (space) {
                    setSelectedSpace(space);
                    navigateToTab('space-detail', { spaceId: space.id, spaceName: space.name });
                  }
                }}
              />
            )}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'create' && <CreateQuest />}
            {activeTab === 'profile' && <UserProfile />}
            {activeTab === 'dashboard' && <UserDashboard onEditProfile={() => setActiveTab('edit-profile')} />}
            {activeTab === 'edit-profile' && <EditProfile onBack={() => navigateToTab('dashboard')} />}
            {activeTab === 'community' && (
              <Community 
                onSeeMoreLeaderboard={() => setActiveTab('full-leaderboard')}
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
                onCreateSpace={() => {
                  // Check if user already has a space
                  if (address) {
                    spaceService.getSpacesByOwner(address).then(existingSpaces => {
                      if (existingSpaces.length > 0) {
                        showToast('You can only create one space. Redirecting to your existing space...', 'warning');
                        setSelectedSpaceId(existingSpaces[0].id);
                        navigateToTab('builder-dashboard');
                        return;
                      }
                    });
                  }
                  localStorage.setItem('spaceBuilderSource', 'community');
                  localStorage.setItem('previousTab', 'community');
                  setPendingSpaceCreation(() => () => {
                    navigateToTab('space-builder');
                  });
                  setShowSubscriptionModal(true);
                }}
                onSeeMoreQuests={() => setActiveTab('all-quests')}
              />
            )}
            {activeTab === 'rewards' && <Rewards />}
            {activeTab === 'bounties' && <Bounties />}
            {activeTab === 'raids' && <Raids />}
            {activeTab === 'full-leaderboard' && <Leaderboard showFull={true} />}
            {activeTab === 'all-quests' && (
              <AllQuests 
                onBack={() => navigateToTab('community')}
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
              />
            )}
            {activeTab === 'quest-detail' && selectedQuestId && (
              <QuestDetail 
                questId={selectedQuestId}
                onBack={() => {
                  const previousTab = localStorage.getItem('previousTab') || 'community';
                  navigateToTab(previousTab);
                }}
                onNavigateToProfile={(address) => {
                  // Navigate to user profile if needed
                  console.log('Navigate to profile:', address);
                }}
              />
            )}
            {activeTab === 'space-builder' && (
              <SpaceBuilder 
                onComplete={(space) => {
                  setSelectedSpaceId(space.id);
                  const source = localStorage.getItem('spaceBuilderSource') || 'discover';
                  const previousTab = localStorage.getItem('previousTab') || source;
                  navigateToTab('builder-dashboard');
                }}
                onBack={() => {
                  const previousTab = localStorage.getItem('previousTab') || 'discover';
                  navigateToTab(previousTab);
                }}
              />
            )}
            {activeTab === 'space-detail' && selectedSpace && (
              <SpaceDetailView 
                space={selectedSpace}
                onBack={() => {
                  const previousTab = localStorage.getItem('previousTab') || 'discover';
                  navigateToTab(previousTab);
                }}
                onQuestClick={(questId) => {
                  setSelectedQuestId(questId);
                  navigateToTab('quest-detail', { questId });
                }}
              />
            )}
            {activeTab === 'builder-dashboard' && (
              <BuilderDashboard 
                spaceId={selectedSpaceId || undefined}
                onBack={() => navigateToTab('discover')}
              />
            )}
          </>
        )}
      </main>
      {showSignupModal && (
        <SignupModal 
          onClose={() => setShowSignupModal(false)}
          onSuccess={() => {
            setShowSignupModal(false);
            if (isConnected && address) {
              const isNewUser = localStorage.getItem('isNewUser') === 'true';
              if (isNewUser) {
                setShowOnboarding(true);
              }
            }
          }}
        />
      )}
      {showOnboarding && (
        <OnboardingSetup 
          onComplete={() => {
            setShowOnboarding(false);
            navigateToTab('discover');
          }}
        />
      )}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          setPendingSpaceCreation(null);
        }}
        onProceed={(tier) => {
          setShowSubscriptionModal(false);
          if (pendingSpaceCreation) {
            pendingSpaceCreation();
            setPendingSpaceCreation(null);
          }
        }}
      />
      {showAdminLogin && (
        <AdminLogin
          onClose={() => setShowAdminLogin(false)}
          onSuccess={() => {
            setShowAdminLogin(false);
            showToast('Admin login successful', 'success');
          }}
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

// Export AppContent for use in AppWithRouter
export { AppContent, TRUST_TOKEN_ADDRESS };
export default App;
