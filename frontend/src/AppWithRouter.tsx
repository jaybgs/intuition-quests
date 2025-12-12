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
    '/spaces': 'spaces',
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
    console.log('🔍 AppWithRouter: Current pathname:', path, 'params:', params);

    // Handle dynamic routes
    if (path.startsWith('/quest/') || path.startsWith('/quest-')) {
      console.log('🔍 AppWithRouter: Detected quest route, returning quest-detail');
      return 'quest-detail';
    }
    if (path.startsWith('/space/') || path.startsWith('/space-')) {
      console.log('🔍 AppWithRouter: Detected space route, returning space-detail');
      return 'space-detail';
    }

    // Handle static routes
    const tab = routeToTab[path] || 'discover';
    console.log('🔍 AppWithRouter: Path', path, '-> Tab', tab);
    return tab;
  };

  // Get quest/space name from URL
  const getQuestName = (): string | null => {
    const path = location.pathname;
    // Handle /quest/* routes
    if (path.startsWith('/quest/')) {
      const questPart = path.replace('/quest/', '');
      console.log('🔍 AppWithRouter: Extracted quest name from /quest/:', questPart);
      return decodeURIComponent(questPart);
    }
    if (path.startsWith('/quest-')) {
      const questPart = path.replace('/quest-', '');
      console.log('🔍 AppWithRouter: Extracted quest name from /quest-:', questPart);
      return decodeURIComponent(questPart);
    }
    if (params.questName) {
      return decodeURIComponent(params.questName);
    }
    if (params['*'] && location.pathname.includes('/quest')) {
      console.log('🔍 AppWithRouter: Extracted quest name from wildcard:', params['*']);
      return decodeURIComponent(params['*']);
    }
    return null;
  };

  const getSpaceName = (): string | null => {
    const path = location.pathname;
    // Handle /space/* routes
    if (path.startsWith('/space/')) {
      const spacePart = path.replace('/space/', '');
      console.log('🔍 AppWithRouter: Extracted space name from /space/:', spacePart);
      return decodeURIComponent(spacePart);
    }
    if (path.startsWith('/space-')) {
      const spacePart = path.replace('/space-', '');
      console.log('🔍 AppWithRouter: Extracted space name from /space-:', spacePart);
      return decodeURIComponent(spacePart);
    }
    if (params.spaceName) {
      return decodeURIComponent(params.spaceName);
    }
    if (params['*'] && location.pathname.includes('/space')) {
      console.log('🔍 AppWithRouter: Extracted space name from wildcard:', params['*']);
      return decodeURIComponent(params['*']);
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
