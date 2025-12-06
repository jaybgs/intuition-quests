import { useLocation, useParams, useNavigate } from 'react-router-dom';
import App from './App';

// Wrapper component that handles routing
export default function AppWithRouter() {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  // Map routes to tabs
  const routeToTab: Record<string, string> = {
    '/home': 'discover',
    '/community': 'community',
    '/rewards': 'rewards',
    '/bounties': 'bounties',
    '/raids': 'raids',
    '/dashboard': 'dashboard',
    '/builder-dashboard': 'builder-dashboard',
    '/create-space': 'space-builder',
    '/create-quest': 'create',
  };

  // Get initial tab from route
  const getInitialTab = (): string => {
    const path = location.pathname;
    
    // Handle dynamic routes
    if (path.startsWith('/quest-')) {
      return 'quest-detail';
    }
    if (path.startsWith('/space-')) {
      return 'space-detail';
    }
    
    // Handle static routes
    return routeToTab[path] || 'discover';
  };

  // Get quest/space name from URL
  const getQuestName = (): string | null => {
    if (params.questName) {
      return decodeURIComponent(params.questName);
    }
    const path = location.pathname;
    if (path.startsWith('/quest-')) {
      return decodeURIComponent(path.replace('/quest-', ''));
    }
    return null;
  };

  const getSpaceName = (): string | null => {
    if (params.spaceName) {
      return decodeURIComponent(params.spaceName);
    }
    const path = location.pathname;
    if (path.startsWith('/space-')) {
      return decodeURIComponent(path.replace('/space-', ''));
    }
    return null;
  };

  return (
    <App
      initialTab={getInitialTab()}
      questName={getQuestName()}
      spaceName={getSpaceName()}
    />
  );
}

