import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrimeReactProvider } from 'primereact/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrimeReactProvider value={{ ripple: true }}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </PrimeReactProvider>
  </StrictMode>,
);
