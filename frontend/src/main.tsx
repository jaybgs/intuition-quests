import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

// Suppress noisy wallet extension errors that we cannot control
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const suppressedPatterns = [
  // Wallet extension conflicts (multiple wallet extensions fighting over window.ethereum)
  'Cannot redefine property: ethereum',
  'Cannot redefine property: isZerion',
  'Cannot redefine property: isRabby',
  'Cannot set property ethereum',
  'Failed to set window.ethereum',
  'SES Removing unpermitted intrinsics',
  'which has only a getter',
  'encountered an error setting the global',
  'Sender: Failed to send batch',
  // Analytics blocked by ad blockers
  'Analytics SDK:',
  'ERR_BLOCKED_BY_CLIENT',
  'net::ERR_BLOCKED_BY_CLIENT',
  'mm-sdk-analytics',
  // GraphQL rate limiting (Intuition API)
  'net::ERR_FAILED 429',
  'Too Many Requests',
  '❌ GraphQL Fetch Error',
  '❌ GraphQL HTTP Error',
  // Informational Trust Token messages (not errors)
  'Trust Token Contract Not Deployed',
  'ℹ️ No identity found',
  'ℹ️ No positions found',
  'ℹ️ No atoms found',
  'ℹ️ No triples found',
];

console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (suppressedPatterns.some(pattern => message.includes(pattern))) {
    return; // Suppress this error
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args.join(' ');
  if (suppressedPatterns.some(pattern => message.includes(pattern))) {
    return; // Suppress this warning
  }
  originalConsoleWarn.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
