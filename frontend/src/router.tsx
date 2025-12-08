import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';

// Create router with all routes
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />,
      },
      {
        path: 'home',
        element: <App initialTab="discover" />,
      },
      {
        path: 'community',
        element: <App initialTab="community" />,
      },
      {
        path: 'rewards',
        element: <App initialTab="rewards" />,
      },
      {
        path: 'bounties',
        element: <App initialTab="bounties" />,
      },
      {
        path: 'raids',
        element: <App initialTab="raids" />,
      },
      {
        path: 'dashboard',
        element: <App initialTab="dashboard" />,
      },
      {
        path: 'builder-dashboard',
        element: <App initialTab="builder-dashboard" />,
      },
      {
        path: 'create-space',
        element: <App initialTab="space-builder" />,
      },
      {
        path: 'create-quest',
        element: <App initialTab="create" />,
      },
      {
        path: 'quest-:questName',
        element: <App initialTab="quest-detail" />,
      },
      {
        path: 'space-:spaceName',
        element: <App initialTab="space-detail" />,
      },
    ],
  },
]);



