import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// Debug: Log initialization
console.log('[Coach Hudl] Initializing app...');
(window as any).__debug = {
  initialized: false,
  mounted: false,
  errors: [] as string[]
};

const container = document.getElementById('root');
if (!container) {
  console.error('[Coach Hudl] Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: monospace;">ERROR: Root element (#root) not found in HTML</div>';
} else {
  console.log('[Coach Hudl] Root element found, creating React root...');
  
  try {
    createRoot(container, {
      // Keeps caught errors off reportError(), which would raise the dev overlay.
      onCaughtError: (error, errorInfo) => {
        console.error('[Coach Hudl ERROR]', error, errorInfo.componentStack);
        (window as any).__debug.errors.push(String(error));
      },
    }).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
    (window as any).__debug.mounted = true;
    console.log('[Coach Hudl] React app mounted successfully');
  } catch (err) {
    console.error('[Coach Hudl] Failed to mount React app:', err);
    (window as any).__debug.errors.push(String(err));
    document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">ERROR: ${err}</div>`;
  }
}
