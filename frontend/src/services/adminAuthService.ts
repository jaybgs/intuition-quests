/**
 * Admin Authentication Service
 * Provides secure admin login functionality independent of wallet connections
 */

// Admin credentials (in production, these should be stored securely on the backend)
// For now, we'll use a simple hash-based approach with localStorage
const ADMIN_CREDENTIALS = [
  {
    username: 'admin',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA256 hash of 'admin'
    role: 'admin'
  },
  {
    username: 'oracle',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA256 hash of 'oracle' - TEMPORARY: Same as admin, MUST BE CHANGED IN PRODUCTION
    role: 'oracle'
  }
];

// Session storage key
const ADMIN_SESSION_KEY = 'admin_session';
const ADMIN_SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

interface AdminSession {
  username: string;
  role: string;
  loginTime: number;
  expiryTime: number;
}

/**
 * Hash a password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Authenticate admin user
 */
export async function authenticateAdmin(username: string, password: string): Promise<{ success: boolean; role?: string; error?: string }> {
  try {
    const passwordHash = await hashPassword(password);
    const admin = ADMIN_CREDENTIALS.find(
      cred => cred.username.toLowerCase() === username.toLowerCase() && cred.passwordHash === passwordHash
    );

    if (!admin) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Create session
    const session: AdminSession = {
      username: admin.username,
      role: admin.role,
      loginTime: Date.now(),
      expiryTime: Date.now() + ADMIN_SESSION_EXPIRY
    };

    // Store session in localStorage
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

    return { success: true, role: admin.role };
  } catch (error: any) {
    console.error('Admin authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Check if admin is currently logged in
 */
export function isAdminLoggedIn(): boolean {
  try {
    const sessionStr = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionStr) return false;

    const session: AdminSession = JSON.parse(sessionStr);
    
    // Check if session is expired
    if (Date.now() > session.expiryTime) {
      logoutAdmin();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get current admin session
 */
export function getAdminSession(): AdminSession | null {
  try {
    const sessionStr = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionStr) return null;

    const session: AdminSession = JSON.parse(sessionStr);
    
    // Check if session is expired
    if (Date.now() > session.expiryTime) {
      logoutAdmin();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Logout admin
 */
export function logoutAdmin(): void {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

/**
 * Check if user has admin role
 */
export function isAdmin(): boolean {
  const session = getAdminSession();
  return session?.role === 'admin' || session?.role === 'oracle';
}

/**
 * Check if user has oracle role
 */
export function isOracle(): boolean {
  const session = getAdminSession();
  return session?.role === 'oracle';
}
