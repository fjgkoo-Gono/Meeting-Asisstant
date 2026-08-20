import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
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
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import Home from '@/pages/home';
import Stats from '@/pages/stats';
import Tasks from '@/pages/tasks';
import ProjectDetail from '@/pages/project';
import MeetingDetail from '@/pages/meeting';
import Login from '@/pages/login';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={() => <AppLayout><Home /></AppLayout>} />
        <Route path="/tasks" component={() => <AppLayout><Tasks /></AppLayout>} />
        <Route path="/stats" component={() => <AppLayout><Stats /></AppLayout>} />
        <Route path="/projects/:id" component={() => <AppLayout><ProjectDetail /></AppLayout>} />
        <Route path="/projects/:projectId/meetings/:meetingId" component={() => <AppLayout><MeetingDetail /></AppLayout>} />

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

function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <Login />;

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Gate />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
