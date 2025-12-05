/**
 * Browser Console Script to Remove "My Quest 2024" from localStorage
 * 
 * Instructions:
 * 1. Open your browser DevTools (F12)
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 */

(function() {
  console.log('🔍 Searching for "My Quest 2024" in localStorage...');
  
  let removedCount = 0;
  const keys = Object.keys(localStorage);
  const publishedKeys = keys.filter(key => key.startsWith('published_quests_'));
  
  publishedKeys.forEach(key => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const quests = JSON.parse(stored);
        const originalLength = quests.length;
        
        // Filter out "My Quest 2024"
        const filteredQuests = quests.filter(quest => {
          const title = quest.title || '';
          return !title.toLowerCase().includes('my quest 2024');
        });
        
        if (filteredQuests.length < originalLength) {
          const removed = originalLength - filteredQuests.length;
          removedCount += removed;
          
          if (filteredQuests.length === 0) {
            // Remove the entire key if no quests remain
            localStorage.removeItem(key);
            console.log(`✅ Removed key "${key}" (contained ${removed} quest(s))`);
          } else {
            // Update with filtered quests
            localStorage.setItem(key, JSON.stringify(filteredQuests));
            console.log(`✅ Removed ${removed} quest(s) from "${key}"`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error processing key "${key}":`, error);
    }
  });
  
  if (removedCount === 0) {
    console.log('ℹ️  No "My Quest 2024" quests found in localStorage');
  } else {
    console.log(`\n✅ Successfully removed ${removedCount} quest(s) from localStorage!`);
  }
  
  // Also check for any quest drafts
  const draftKeys = keys.filter(key => key.startsWith('quest_draft_'));
  let draftRemovedCount = 0;
  
  draftKeys.forEach(key => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const draft = JSON.parse(stored);
        if (draft.title && draft.title.toLowerCase().includes('my quest 2024')) {
          localStorage.removeItem(key);
          draftRemovedCount++;
          console.log(`✅ Removed draft "${draft.title}" from "${key}"`);
        }
      }
    } catch (error) {
      // Ignore errors for draft keys
    }
  });
  
  if (draftRemovedCount > 0) {
    console.log(`✅ Removed ${draftRemovedCount} draft(s) from localStorage!`);
  }
  
  console.log('\n✨ Cleanup complete!');
})();

