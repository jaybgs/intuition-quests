/**
 * Script to clear all localStorage data related to quests, spaces, and builder profiles
 * Run this in the browser console or as a Node.js script
 */

const keysToDelete = [
  // Spaces
  'spaces',
  'spaces_by_slug',
  
  // Quest drafts and published quests
  'quests',
  'quest_drafts',
  'raids_quest_drafts_',
  'raids_published_',
  'published_quests_',
  
  // Space-related
  'space_followers_',
  'space_quests_',
  'space_token_status_',
  'space_token_symbol_',
  'space_twitter_url_',
  'user_spaces_',
  'space_xp_',
  'spaceBuilderSource',
  
  // Quest drafts (pattern-based)
];

function clearLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.log('localStorage is not available (running in Node.js)');
    console.log('This script should be run in the browser console.');
    return;
  }

  console.log('Starting localStorage cleanup...');
  
  let deletedCount = 0;
  
  // Filter out mock spaces from the spaces array
  const spacesKey = 'spaces';
  const spacesData = localStorage.getItem(spacesKey);
  if (spacesData) {
    try {
      const spaces = JSON.parse(spacesData);
      const filteredSpaces = spaces.filter(space => !space.id.startsWith('space_mock_'));
      
      if (filteredSpaces.length !== spaces.length) {
        const removedCount = spaces.length - filteredSpaces.length;
        if (filteredSpaces.length === 0) {
          localStorage.removeItem(spacesKey);
          deletedCount++;
          console.log(`Deleted: ${spacesKey} (removed ${removedCount} mock spaces)`);
        } else {
          localStorage.setItem(spacesKey, JSON.stringify(filteredSpaces));
          deletedCount += removedCount;
          console.log(`Filtered out ${removedCount} mock spaces from ${spacesKey}`);
        }
      }
    } catch (error) {
      console.error('Error filtering mock spaces:', error);
    }
  }
  
  // Delete specific keys
  keysToDelete.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      deletedCount++;
      console.log(`Deleted: ${key}`);
    }
  });
  
  // Delete all keys matching patterns
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    // Delete mock space stats
    if (key.startsWith('space_followers_space_mock_') || 
        key.startsWith('space_quests_space_mock_') || 
        key.startsWith('space_token_status_space_mock_') || 
        key.startsWith('space_token_symbol_space_mock_')) {
      localStorage.removeItem(key);
      deletedCount++;
      console.log(`Deleted: ${key}`);
    }
    
    // Delete quest drafts
    if (key.startsWith('quest_draft_')) {
      localStorage.removeItem(key);
      deletedCount++;
      console.log(`Deleted: ${key}`);
    }
    
    // Delete published quests by address
    if (key.startsWith('published_quests_')) {
      localStorage.removeItem(key);
      deletedCount++;
      console.log(`Deleted: ${key}`);
    }
    
    // Delete space-related keys
    if (key.startsWith('space_followers_') || 
        key.startsWith('space_quests_') || 
        key.startsWith('space_token_status_') || 
        key.startsWith('space_token_symbol_') || 
        key.startsWith('space_twitter_url_') || 
        key.startsWith('user_spaces_') || 
        key.startsWith('space_xp_')) {
      localStorage.removeItem(key);
      deletedCount++;
      console.log(`Deleted: ${key}`);
    }
    
    // Delete raid-related keys (if any remain)
    if (key.startsWith('raids_')) {
      localStorage.removeItem(key);
      deletedCount++;
      console.log(`Deleted: ${key}`);
    }
  });
  
  console.log(`\n✅ Cleaned up ${deletedCount} localStorage items`);
  console.log('✅ localStorage cleanup completed!');
}

// If running in browser
if (typeof window !== 'undefined') {
  clearLocalStorage();
} else {
  // If running in Node.js, export the function
  module.exports = { clearLocalStorage };
  console.log('To use this script in the browser:');
  console.log('1. Open your browser console');
  console.log('2. Copy and paste the clearLocalStorage function');
  console.log('3. Run: clearLocalStorage()');
}

