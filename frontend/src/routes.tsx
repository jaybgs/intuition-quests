import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppWithRouter from './AppWithRouter';
import { OAuthCallback } from './components/OAuthCallback';

// Create router with all routes
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  {
    path: '/home',
    element: <AppWithRouter />,
  },
  {
    path: '/community',
    element: <AppWithRouter />,
  },
  {
    path: '/spaces',
    element: <AppWithRouter />,
  },
  {
    path: '/rewards',
    element: <AppWithRouter />,
  },
  {
    path: '/bounties',
    element: <AppWithRouter />,
  },
  {
    path: '/raids',
    element: <AppWithRouter />,
  },
  {
    path: '/dashboard',
    element: <AppWithRouter />,
  },
  {
    path: '/builder-dashboard',
    element: <AppWithRouter />,
  },
  {
    path: '/create-space',
    element: <AppWithRouter />,
  },
  {
    path: '/create-quest',
    element: <AppWithRouter />,
  },
  // Quest routes - using wildcard to match any quest identifier
  {
    path: '/quest/*',
    element: <AppWithRouter />,
  },
  // Space routes
  {
    path: '/space/*',
    element: <AppWithRouter />,
  },
  // OAuth callback routes - must be before catch-all
  {
    path: '/oauth/twitter/callback',
    element: <OAuthCallback />,
  },
  {
    path: '/oauth/discord/callback',
    element: <OAuthCallback />,
  },
  {
    path: '/oauth/github/callback',
    element: <OAuthCallback />,
  },
  {
    path: '/oauth/google/callback',
    element: <OAuthCallback />,
  },
]);
