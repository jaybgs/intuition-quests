import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppWithRouter from './AppWithRouter';

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
  {
    path: '/quest-:questName',
    element: <AppWithRouter />,
  },
  {
    path: '/space-:spaceName',
    element: <AppWithRouter />,
    caseSensitive: false,
  },
  {
    path: '*',
    element: <Navigate to="/home" replace />,
  },
]);



