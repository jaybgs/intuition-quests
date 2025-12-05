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
      checkAdminStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkAdminStatus = () => {
    setIsLoading(true);
    const loggedIn = isAdminLoggedIn();
    const session = getAdminSession();
    
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
