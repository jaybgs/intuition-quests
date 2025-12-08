# Complete Routing Implementation Guide

This guide provides all the files needed to implement routing for TrustQuests.

## Step 1: Install Dependencies

```bash
cd frontend
npm install react-router-dom@^6.20.0
npm install --save-dev @types/react-router-dom@^5.3.3
```

## Step 2: Files to Create/Update

### Files Already Created:
1. ✅ `frontend/src/routes.tsx` - Route configuration
2. ✅ `frontend/src/AppWithRouter.tsx` - Router wrapper
3. ✅ `frontend/src/main.tsx` - Updated to use RouterProvider
4. ✅ `frontend/package.json` - Added react-router-dom dependency

### Files to Update:

#### `frontend/src/App.tsx`
You need to make these key changes:

1. **Add imports at the top:**
```tsx
import { Link, useNavigate } from 'react-router-dom';
```

2. **Update AppContent function signature:**
```tsx
interface AppContentProps {
  initialTab?: string;
  questName?: string | null;
  spaceName?: string | null;
}

function AppContent({ initialTab = 'discover', questName = null, spaceName = null }: AppContentProps) {
  const navigate = useNavigate();
  // ... rest of function
}
```

3. **Add navigation helper function:**
```tsx
// Helper function to create URL-friendly slug from name
const createSlug = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Navigation helper
const navigateToTab = (tab: string, params?: { questId?: string; questName?: string; spaceId?: string; spaceName?: string }) => {
  const routeMap: Record<string, string> = {
    'discover': '/home',
    'community': '/community',
    'rewards': '/rewards',
    'bounties': '/bounties',
    'raids': '/raids',
    'dashboard': '/dashboard',
    'builder-dashboard': '/builder-dashboard',
    'space-builder': '/create-space',
    'create': '/create-quest',
  };

  if (params?.questName) {
    navigate(`/quest-${createSlug(params.questName)}`);
  } else if (params?.questId) {
    // Try to get quest name first
    questServiceBackend.getQuestById(params.questId).then(quest => {
      if (quest) {
        navigate(`/quest-${createSlug(quest.title)}`);
      } else {
        navigate(`/quest-${params.questId}`);
      }
    }).catch(() => {
      navigate(`/quest-${params.questId}`);
    });
  } else if (params?.spaceName) {
    navigate(`/space-${createSlug(params.spaceName)}`);
  } else if (params?.spaceId) {
    // Try to get space name first
    const space = spaceService.getSpaceById(params.spaceId);
    if (space) {
      navigate(`/space-${createSlug(space.name)}`);
    } else {
      navigate(`/space-${params.spaceId}`);
    }
  } else if (routeMap[tab]) {
    navigate(routeMap[tab]);
  } else {
    setActiveTab(tab as any);
  }
};
```

4. **Update menuItems to include paths:**
```tsx
const menuItems = [
  { 
    label: 'Discover & Earn',
    tab: 'discover',
    path: '/home',
    // ... icon
  },
  { 
    label: 'Community',
    tab: 'community',
    path: '/community',
    // ... icon
  },
  // ... etc
];
```

5. **Replace `<a href="#">` with `<Link to={item.path}>` in navigation:**
```tsx
{menuItems.map((item, index) => (
  <Link
    key={index}
    to={item.path}
    className="header-nav-item"
    // ... rest of props
    onClick={(e) => {
      e.preventDefault();
      navigateToTab(item.tab);
    }}
  >
    <span className="header-nav-text">{item.label}</span>
  </Link>
))}
```

6. **Replace all `setActiveTab()` calls with `navigateToTab()`:**
- When clicking quest cards: `navigateToTab('quest-detail', { questId })`
- When clicking space cards: `navigateToTab('space-detail', { spaceId, spaceName })`
- When navigating to dashboard: `navigateToTab('dashboard')`
- etc.

7. **Add useEffect to sync with initialTab:**
```tsx
// Sync activeTab with initialTab prop (for routing)
useEffect(() => {
  if (initialTab) {
    setActiveTab(initialTab as any);
  }
}, [initialTab]);
```

8. **Add useEffect to handle quest/space names from URL:**
```tsx
// Handle quest name from URL
useEffect(() => {
  if (questName && activeTab === 'quest-detail') {
    const findQuestByName = async () => {
      try {
        const quests = await questServiceBackend.getAllQuests();
        const quest = quests.find(q => 
          q.title.toLowerCase().replace(/\s+/g, '-') === questName.toLowerCase() ||
          q.id === questName
        );
        if (quest) {
          setSelectedQuestId(quest.id);
        }
      } catch (error) {
        console.error('Error finding quest:', error);
      }
    };
    findQuestByName();
  }
}, [questName, activeTab]);

// Handle space name from URL
useEffect(() => {
  if (spaceName && activeTab === 'space-detail') {
    const findSpaceByName = async () => {
      try {
        const spaces = await spaceService.getAllSpaces();
        const space = spaces.find(s => 
          s.slug === spaceName.toLowerCase() ||
          s.name.toLowerCase().replace(/\s+/g, '-') === spaceName.toLowerCase() ||
          s.id === spaceName
        );
        if (space) {
          setSelectedSpace(space);
        }
      } catch (error) {
        console.error('Error finding space:', error);
      }
    };
    findSpaceByName();
  }
}, [spaceName, activeTab]);
```

9. **Update logo link:**
```tsx
<Link to="/home" className="logo">
  <img src="/logo.svg" alt="TrustQuests Logo" className="logo-icon" />
</Link>
```

## Step 3: Update Quest Card Clicks

In components that render quest cards (CommunityQuestCard, QuestCard, etc.), update onClick handlers:

```tsx
onClick={() => {
  // Get quest name for URL
  const questSlug = quest.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  navigate(`/quest-${questSlug}`);
  // Or use the navigateToTab helper if available in context
}}
```

## Step 4: Update Space Card Clicks

In components that render space cards, update onClick handlers:

```tsx
onClick={() => {
  // Get space name for URL
  const spaceSlug = space.slug || space.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  navigate(`/space-${spaceSlug}`);
}}
```

## Step 5: Build Configuration

If deploying to a static host, you may need to configure your build tool:

### For Vite (vite.config.ts):
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Add this for SPA routing
  build: {
    rollupOptions: {
      // Ensure all routes work on refresh
    }
  }
});
```

### For deployment (e.g., Netlify, Vercel):

Create `public/_redirects` (Netlify) or `vercel.json` (Vercel):

**Netlify `public/_redirects`:**
```
/*    /index.html   200
```

**Vercel `vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Testing Checklist

- [ ] All main navigation links work
- [ ] Direct URL access works (e.g., `/community`)
- [ ] Quest detail pages load with correct quest from URL
- [ ] Space detail pages load with correct space from URL
- [ ] Browser back/forward buttons work
- [ ] Page refreshes maintain correct state
- [ ] Quest cards navigate to correct URLs
- [ ] Space cards navigate to correct URLs
- [ ] Logo click goes to home
- [ ] All modals and overlays still work

## Route Summary

| URL | Component | Tab State |
|-----|-----------|-----------|
| `/` | Redirect | → `/home` |
| `/home` | ProjectSlideshow | `discover` |
| `/community` | Community | `community` |
| `/rewards` | Rewards | `rewards` |
| `/bounties` | Bounties | `bounties` |
| `/raids` | Raids | `raids` |
| `/dashboard` | UserDashboard | `dashboard` |
| `/builder-dashboard` | BuilderDashboard | `builder-dashboard` |
| `/create-space` | SpaceBuilder | `space-builder` |
| `/create-quest` | CreateQuest | `create` |
| `/quest-:questName` | QuestDetail | `quest-detail` |
| `/space-:spaceName` | SpaceDetailView | `space-detail` |

## Notes

- Quest names in URLs are slugified (lowercase, spaces to hyphens, special chars removed)
- Space names use their slug if available, otherwise slugified name
- If quest/space not found by name, falls back to ID lookup
- All routes are client-side (SPA), so server must be configured to serve index.html for all routes



