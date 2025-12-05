import { useState } from 'react';
import { authenticateAdmin } from '../services/adminAuthService';
import { showToast } from './Toast';
import './AdminLogin.css';

interface AdminLoginProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function AdminLogin({ onSuccess, onCancel }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      showToast('Please enter both username and password', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateAdmin(username.trim(), password);
      
      if (result.success) {
        showToast(`Successfully logged in as ${result.role}`, 'success');
        onSuccess();
      } else {
        showToast(result.error || 'Authentication failed', 'error');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showToast('An error occurred during login', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-overlay">
      <div className="admin-login-modal">
        <div className="admin-login-header">
          <h2 className="admin-login-title">Admin Access</h2>
          {onCancel && (
            <button
              className="admin-login-close"
              onClick={onCancel}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-login-field">
            <label className="admin-login-label">
              Username
            </label>
            <input
              type="text"
              className="admin-login-input"
              placeholder="Enter admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="admin-login-field">
            <label className="admin-login-label">
              Password
            </label>
            <input
              type="password"
              className="admin-login-input"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <div className="admin-login-actions">
            {onCancel && (
              <button
                type="button"
                className="admin-login-button cancel"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="admin-login-button submit"
              disabled={isLoading || !username.trim() || !password.trim()}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="admin-login-footer">
          <p className="admin-login-hint">
            Admin access allows you to manage the site even without a wallet connection.
          </p>
        </div>
      </div>
    </div>
  );
}
