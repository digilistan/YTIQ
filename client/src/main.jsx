import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global Fetch Interceptor for JWT injection & API gateway routing
const originalFetch = window.fetch;
window.fetch = async function (input, init = {}) {
  // In production builds (packaged app), always direct database API calls to the secure remote VPS.
  // In development mode (Vite dev server), use relative pathing to allow Vite proxying.
  const API_BASE = import.meta.env.PROD ? 'https://tools.digilistan.com' : '';
  const NANOBANANA_BASE = 'http://127.0.0.1:5055';
  
  let finalInput = input;
  if (typeof input === 'string') {
    if (input.startsWith('/api/nanobanana/')) {
      finalInput = input.replace('/api/nanobanana/', `${NANOBANANA_BASE}/`);
    } else if (input.startsWith('/api/')) {
      finalInput = `${API_BASE}${input}`;
    }
  } else if (input && typeof input === 'object' && input.url) {
    if (input.url.startsWith('/api/nanobanana/')) {
      try {
        finalInput = new Request(input.url.replace('/api/nanobanana/', `${NANOBANANA_BASE}/`), input);
      } catch (_) {}
    } else if (input.url.startsWith('/api/')) {
      try {
        finalInput = new Request(`${API_BASE}${input.url}`, input);
      } catch (_) {
        // Fallback if Request cloning fails
      }
    }
  }

  const token = localStorage.getItem('csd_token');
  if (token) {
    if (typeof finalInput === 'string') {
      if (finalInput.includes('/api/')) {
        init.headers = {
          ...init.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    } else if (finalInput && typeof finalInput === 'object') {
      if (finalInput.url.includes('/api/')) {
        try {
          finalInput.headers.set('Authorization', `Bearer ${token}`);
        } catch (_) {
          init.headers = {
            ...init.headers,
            'Authorization': `Bearer ${token}`
          };
        }
      }
    }
  }
  return originalFetch(finalInput, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
