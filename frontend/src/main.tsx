import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Ensure CSS is imported at the entry point
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

