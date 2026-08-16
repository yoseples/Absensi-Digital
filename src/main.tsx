import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Signal that React JavaScript environment has loaded successfully
(window as any).__reactMounted = true;

// Remove fallback HTML splash screen smoothly
const splashEl = document.getElementById('splash-fallback');
if (splashEl) {
  splashEl.style.opacity = '0';
  setTimeout(() => {
    if (splashEl && splashEl.parentNode) {
      splashEl.parentNode.removeChild(splashEl);
    }
  }, 400);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
