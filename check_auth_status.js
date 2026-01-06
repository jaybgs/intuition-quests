// Check authentication status in browser console
// Run this in browser developer console

console.log('=== AUTHENTICATION STATUS CHECK ===');

// Check wallet connection
console.log('Wallet connected:', window.ethereum?.isConnected?.() || 'Unknown');
console.log('Selected address:', window.ethereum?.selectedAddress || 'None');

// Check localStorage auth token
const authToken = localStorage.getItem('auth_token');
console.log('Auth token exists:', !!authToken);
if (authToken) {
  console.log('Auth token (first 50 chars):', authToken.substring(0, 50) + '...');
} else {
  console.log('❌ No auth token found - user needs to connect wallet');
}

// Check if user is logged in (from useAuth hook)
console.log('Current URL:', window.location.href);

// Instructions for user
console.log('\n=== TROUBLESHOOTING ===');
console.log('1. Connect your wallet in the app');
console.log('2. Make sure you have only ONE wallet extension enabled');
console.log('3. Try refreshing the page after connecting');
console.log('4. Check browser console for wallet connection errors');



