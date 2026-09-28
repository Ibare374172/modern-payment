import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Defensive handler to ignore external browser wallet extensions (MetaMask, Phantom, etc.)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (typeof reason === 'string' ? reason : reason?.message || '') + '';
  if (
    msg.includes('MetaMask') || 
    msg.includes('metamask') || 
    msg.includes('ethereum') ||
    msg.includes('Failed to connect to MetaMask')
  ) {
    event.preventDefault();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    console.warn('[Extension Notice] Suppressed MetaMask extension rejection:', msg);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

