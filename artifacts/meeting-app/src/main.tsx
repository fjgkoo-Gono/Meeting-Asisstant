import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// Reuses the client's bearer-token hook to send the API's shared-secret
// header (see artifacts/api-server/src/middlewares/auth.ts) — not a real
// user session, just enough to deter automated abuse once deployed.
setAuthTokenGetter(() => import.meta.env.VITE_API_SHARED_SECRET || null);

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
