import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { AppLayout } from '@/components/layout/app-layout';
import Home from '@/pages/home';
import Stats from '@/pages/stats';
import ProjectDetail from '@/pages/project';
import MeetingDetail from '@/pages/meeting';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Pages that have the bottom nav */}
        <Route path="/" component={() => <AppLayout><Home /></AppLayout>} />
        <Route path="/stats" component={() => <AppLayout><Stats /></AppLayout>} />
        
        {/* Detail pages (no bottom nav, just back button in header) */}
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/projects/:projectId/meetings/:meetingId" component={MeetingDetail} />
        
        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
