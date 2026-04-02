import React from 'react';
import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import ExplorerUnified from '@/pages/xplorer';
import NotFound from '@/pages/not-found';
import './styles/tokyo-night.css';

// Lazy-loaded pages -- Settings is only needed when navigating to /settings
const Settings = React.lazy(() => import('@/pages/settings'));

const Router = () => {
  return (
    <React.Suspense
      fallback={
        <div className="bg-xp-bg text-xp-text flex h-screen items-center justify-center text-sm">
          Loading...
        </div>
      }
    >
      <Switch>
        <Route path="/" component={ExplorerUnified} />
        <Route path="/explorer" component={ExplorerUnified} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
};

export default App;
