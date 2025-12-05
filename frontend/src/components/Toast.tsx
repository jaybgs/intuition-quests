import { useState, useEffect } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastIdCounter = 0;
const toasts: Toast[] = [];
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function showToast(message: string, type: ToastType = 'info') {
  // Fallback to console if toast system isn't ready
  if (typeof window === 'undefined') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    return;
  }
  
  try {
    const id = `toast-${toastIdCounter++}`;
    const toast: Toast = { id, message, type };
    
    toasts.push(toast);
    notifyListeners();
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      const index = toasts.findIndex(t => t.id === id);
      if (index > -1) {
        toasts.splice(index, 1);
        notifyListeners();
      }
    }, 5000);
  } catch (error) {
    // Fallback to console if toast fails
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

export function ToastContainer() {
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const listener = () => forceUpdate(prev => prev + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function Toast({ toast }: { toast: Toast }) {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === toast.id);
        if (index > -1) {
          toasts.splice(index, 1);
          notifyListeners();
        }
      }, 300);
    }, 4700);
    
    return () => clearTimeout(timer);
  }, [toast.id]);
  
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      const index = toasts.findIndex(t => t.id === toast.id);
      if (index > -1) {
        toasts.splice(index, 1);
        notifyListeners();
      }
    }, 300);
  };
  
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        );
      case 'info':
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        );
    }
  };
  
  return (
    <div className={`toast toast-${toast.type} ${isExiting ? 'toast-exiting' : ''}`}>
      <div className="toast-content">
        <div className="toast-icon">
          {getIcon()}
        </div>
        <span className="toast-message">{toast.message}</span>
        <button className="toast-close" onClick={handleClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="toast-progress"></div>
    </div>
  );
}
