# Routing Setup for TrustQuests

This document explains how to set up routing for your TrustQuests website.

## Installation

First, install React Router DOM:

```bash
cd frontend
npm install react-router-dom
npm install --save-dev @types/react-router-dom
```

## Files Created/Modified

### 1. `frontend/src/routes.tsx` (NEW)
- Defines all routes for the application
- Maps URLs to components

### 2. `frontend/src/AppWithRouter.tsx` (NEW)
- Wrapper component that extracts route information
- Passes route data to the main App component

### 3. `frontend/src/main.tsx` (MODIFY)
- Update to use RouterProvider instead of direct App import

### 4. `frontend/src/App.tsx` (MODIFY)
- Add props interface for routing
- Update navigation to use Link components
- Handle route-based tab switching

## Route Mapping

| URL | Tab | Component |
|-----|-----|-----------|
| `/` | - | Redirects to `/home` |
| `/home` | `discover` | ProjectSlideshow |
| `/community` | `community` | Community |
| `/rewards` | `rewards` | Rewards |
| `/bounties` | `bounties` | Bounties |
| `/raids` | `raids` | Raids |
| `/dashboard` | `dashboard` | UserDashboard |
| `/builder-dashboard` | `builder-dashboard` | BuilderDashboard |
| `/create-space` | `space-builder` | SpaceBuilder |
| `/create-quest` | `create` | CreateQuest |
| `/quest-:questName` | `quest-detail` | QuestDetail |
| `/space-:spaceName` | `space-detail` | SpaceDetailView |

## Implementation Steps

1. **Install dependencies** (see Installation above)

2. **Update main.tsx**:
   ```tsx
   import { RouterProvider } from 'react-router-dom';
   import { router } from './routes';
   
   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <RouterProvider router={router} />
     </React.StrictMode>
   );
   ```

3. **Update App.tsx**:
   - Add props interface:
     ```tsx
     interface AppProps {
       initialTab?: string;
       questName?: string | null;
       spaceName?: string | null;
       navigate?: (path: string) => void;
     }
     ```
   - Update AppContent to accept and use these props
   - Replace `setActiveTab` calls with navigation calls where appropriate

4. **Update navigation links**:
   - Replace `<a href="#">` with `<Link to="/path">` from react-router-dom
   - Update onClick handlers to use `navigate()` function

5. **Handle quest/space name extraction**:
   - When clicking quest cards, navigate to `/quest-${questName}`
   - When clicking space cards, navigate to `/space-${spaceName}`
   - Extract names from URLs and find corresponding quests/spaces

## Testing

After implementation, test:
- All main navigation links work
- Direct URL access works (e.g., `/community`)
- Quest detail pages load with correct quest
- Space detail pages load with correct space
- Browser back/forward buttons work
- Page refreshes maintain correct state



