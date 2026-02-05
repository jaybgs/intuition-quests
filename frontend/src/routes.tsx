import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppWithRouter from './AppWithRouter';
import { SocialCallback } from './components/SocialCallback';
import { ErrorBoundary } from './components/ErrorBoundary';

// Create router with all routes
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/home" replace />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/home',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/community',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/spaces',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/rewards',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/bounties',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/raids',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/dashboard',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/builder-dashboard',
    element: <Navigate to="/space-dashboard" replace />,
  },
  {
    path: '/space-dashboard',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/create-space',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/create-quest',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  {
    path: '/edit-slideshow',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  // Quest routes - using wildcard to match any quest identifier
  {
    path: '/quest/*',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  // Space routes
  {
    path: '/space/*',
    element: <AppWithRouter />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  // Social OAuth callback
  {
    path: '/auth/social-callback',
    element: <SocialCallback />,
    errorElement: <ErrorBoundary><AppWithRouter /></ErrorBoundary>,
  },
  // Catch-all route for 404s
  {
    path: '*',
    element: <Navigate to="/home" replace />,
  },
]);
