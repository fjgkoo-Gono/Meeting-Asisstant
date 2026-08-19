import { useGetStats } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Calendar, FolderOpen, History, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Stats() {
  const { data: stats, isLoading } = useGetStats();

  return (
    <div className="flex-1 flex flex-col pt-safe px-4 py-6 max-w-md md:max-w-xl lg:max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-serif font-bold text-foreground mb-8">Actividad</h1>

      {isLoading ? (
        <div className="flex flex-col gap-6">
          <div className="flex gap-4">
            <div className="flex-1 h-24 bg-muted/50 animate-pulse rounded-2xl" />
            <div className="flex-1 h-24 bg-muted/50 animate-pulse rounded-2xl" />
          </div>
          <div className="h-64 bg-muted/50 animate-pulse rounded-2xl mt-4" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-2">
              <FolderOpen className="h-6 w-6 text-primary mb-1" />
              <span className="text-3xl font-serif font-bold text-foreground">{stats?.totalProjects ?? 0}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Proyectos</span>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-2">
              <Calendar className="h-6 w-6 text-primary mb-1" />
              <span className="text-3xl font-serif font-bold text-foreground">{stats?.totalMeetings ?? 0}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reuniones</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-serif font-semibold text-foreground">Reuniones recientes</h2>
          </div>

          <div className="flex flex-col gap-3">
            {!stats?.recentMeetings?.length ? (
              <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-2xl border-dashed">
                <p className="text-sm">No hay reuniones recientes.</p>
              </div>
            ) : (
              stats.recentMeetings.map((meeting) => (
                <Link key={meeting.id} href={`/projects/${meeting.projectId}/meetings/${meeting.id}`}>
                  <div className="group flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-sm active-elevate hover-elevate transition-all cursor-pointer">
                    <div className="flex flex-col gap-1 pr-4">
                      <h3 className="font-medium text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">{meeting.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-primary/70">{meeting.projectName}</span>
                        <span>&bull;</span>
                        <span>{format(parseISO(meeting.date), "d 'de' MMM, yyyy", { locale: es })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
