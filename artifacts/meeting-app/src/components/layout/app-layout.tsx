import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutList, BarChart2, ListTodo, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// Mobile: bottom tab bar (page itself owns scrolling, same as before).
// Desktop (md+): left sidebar that stays put — the viewport height is fixed
// and only <main> scrolls, so the sidebar never scrolls out of view no
// matter which page (including project/meeting detail) is open.
export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useAuth();
  const isHome = location === '/' || location.startsWith('/projects');
  const isTasks = location === '/tasks';
  const isStats = location === '/stats';

  return (
    <div className="flex min-h-[100dvh] md:h-[100dvh] md:overflow-hidden bg-background text-foreground">
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-border md:pt-safe">
        <div className="px-5 py-6">
          <span className="text-lg font-serif font-bold text-foreground">Meeting Assistant</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isHome ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <LayoutList className="w-5 h-5" />
            Proyectos
          </Link>
          <Link
            href="/tasks"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isTasks ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <ListTodo className="w-5 h-5" />
            Tareas
          </Link>
          <Link
            href="/stats"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isStats ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            Actividad
          </Link>
        </nav>

        <button
          onClick={() => signOut()}
          className="mt-auto flex items-center gap-3 px-3 py-2.5 mx-3 mb-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 pb-safe flex flex-col mb-16 md:mb-0 min-w-0 md:overflow-y-auto">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
        <div className="flex h-16 items-center justify-around">
          <Link href="/" className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground">
            <NavItem icon={LayoutList} label="Proyectos" isActive={isHome} />
          </Link>
          <Link href="/tasks" className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground">
            <NavItem icon={ListTodo} label="Tareas" isActive={isTasks} />
          </Link>
          <Link href="/stats" className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground">
            <NavItem icon={BarChart2} label="Actividad" isActive={isStats} />
          </Link>
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon: Icon, label, isActive }: { icon: any, label: string, isActive: boolean }) {
  return (
    <>
      <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
    </>
  );
}
