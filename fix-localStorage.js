// Fix localStorage space ID mismatch
// Run this in browser console to clear problematic space data

// Clear the mismatched space data
localStorage.removeItem('selectedSpace');
localStorage.removeItem('selectedSpaceId');

// Clear any quest draft data that might be corrupted
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('quest_draft') || key.includes('quest_drafts'))) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));

console.log('Cleared problematic localStorage data. Please refresh the page.');
console.log('Available spaces in database:', [
  { id: '354ba76a-a1f0-4287-bd4e-de548f631257', name: 'DND', slug: 'dnd-1' },
  { id: 'bdbf94ce-9fff-41d9-bdd4-f88b6ac594b6', name: 'DND', slug: 'dnd' },
  { id: '1e9618fb-c0cd-47d1-8b80-57a9a9815678', name: 'Test Pace 5 nv', slug: 'test-pace-5-nv' },
  { id: '9b930e60-040c-40da-abca-63c36fb52a1c', name: 'Test Space Supabase II', slug: 'test-space-supabase...' }
]);



