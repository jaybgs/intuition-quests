import { useState, useEffect } from 'react';
import {
  isAdminLoggedIn,
  getAdminSession,
  logoutAdmin,
  isAdmin,
  isOracle
} from '../services/adminAuthService';

export function useAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();

    // Listen for storage changes (e.g., logout from another tab)
    const handleStorageChange = () => {
      console.log('🔄 useAdmin: storage event detected');
      checkAdminStatus();
    };

    // Listen for custom event for same-tab updates
    const handleCustomAuthEvent = () => {
      console.log('🔄 useAdmin: admin-session-changed event detected');
      checkAdminStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('admin-session-changed', handleCustomAuthEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('admin-session-changed', handleCustomAuthEvent);
    };
  }, []);

  const checkAdminStatus = () => {
    setIsLoading(true);
    const loggedIn = isAdminLoggedIn();
    const session = getAdminSession();
    const adminStatus = session?.role === 'admin' || session?.role === 'oracle';

    console.log('🔐 useAdmin checkAdminStatus:', {
      loggedIn,
      session: session ? { role: session.role, expiryTime: session.expiryTime } : null,
      adminStatus,
      currentTime: Date.now()
    });

    setIsAuthenticated(loggedIn);
    setAdminRole(session?.role || null);
    setIsLoading(false);
  };

  const logout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
    setAdminRole(null);
  };

  return {
    isAdmin: isAdmin(),
    isOracle: isOracle(),
    isAuthenticated,
    adminRole,
    isLoading,
    logout,
    refresh: checkAdminStatus
  };
}
