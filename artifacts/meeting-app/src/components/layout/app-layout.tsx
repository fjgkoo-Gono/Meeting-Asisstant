import { type ReactNode } from 'react';
import { Link, useRoute } from 'wouter';
import { LayoutList, BarChart2 } from 'lucide-react';

export function AppLayout({ children }: { children: ReactNode }) {
  const [isHome] = useRoute('/');
  const [isStats] = useRoute('/stats'); // we'll put stats on home actually, maybe bottom nav goes Home vs Recent?
  // Re-reading requirements:
  // "Bottom tab bar with icons for navigation (Projects home, Recent/Stats). Big touch targets (min 48px height)."
  // OK, let's define Routes: `/` (Home dashboard), `/stats` or maybe `/recent` ?
  // Actually, the requirements say "Home dashboard: project list with meeting counts... Also show stats (total projects, total meetings, recent meetings)"
  // So stats are ON the home page? Or maybe a separate tab for Stats. Let's make `/` for Projects and `/stats` for Stats.
  // Wait, "Home dashboard: project list with meeting counts and a New Project button. Also show stats...". It implies they might be on one page or split. Let's split into two tabs for clarity, or just put them on the same page.
  // Let's do `/` for Projects, `/activity` for Stats & Recent.

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground">
      <main className="flex-1 pb-safe flex flex-col mb-16">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
        <div className="flex h-16 items-center justify-around">
          <Link href="/" className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground">
            {/* We will color active state via className matching */}
            <NavItem icon={LayoutList} label="Projects" isActive={isHome} />
          </Link>
          <Link href="/stats" className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground">
            <NavItem icon={BarChart2} label="Stats" isActive={isStats} />
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
