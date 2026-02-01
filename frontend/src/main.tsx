import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

// Suppress noisy wallet extension errors that we cannot control
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const suppressedPatterns = [
  'Cannot redefine property: ethereum',
  'Cannot redefine property: isZerion',
  'Cannot set property ethereum',
  'Failed to set window.ethereum',
  'SES Removing unpermitted intrinsics',
  'Sender: Failed to send batch',
  'Analytics SDK:',
  'ERR_BLOCKED_BY_CLIENT',
  'net::ERR_BLOCKED_BY_CLIENT',
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
