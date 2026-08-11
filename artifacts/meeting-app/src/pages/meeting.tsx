import { useGetMeeting, useGetProject, getGetProjectQueryKey, getGetMeetingQueryKey } from '@workspace/api-client-react';
import { Link, useRoute } from 'wouter';
import { ChevronLeft, Calendar, Paperclip } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function MeetingDetail() {
  const [, params] = useRoute('/projects/:projectId/meetings/:meetingId');
  const projectId = Number(params?.projectId);
  const meetingId = Number(params?.meetingId);

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: meeting, isLoading } = useGetMeeting(projectId, meetingId, {
    query: { enabled: !!(projectId && meetingId), queryKey: getGetMeetingQueryKey(projectId, meetingId) }
  });

  return (
    <div className="flex flex-col min-h-screen pt-safe bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center h-14 px-4 max-w-md mx-auto w-full">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10 rounded-full shrink-0">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex-1 px-2 overflow-hidden flex flex-col items-center justify-center">
            <h1 className="text-sm font-semibold truncate w-full text-center">
              {project?.name ?? 'Loading...'}
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Project</span>
          </div>
          <div className="w-10 shrink-0" />
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 py-8 max-w-md mx-auto w-full gap-8 pb-safe">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="h-10 w-3/4 bg-muted/50 animate-pulse rounded-xl" />
            <div className="h-4 w-1/3 bg-muted/50 animate-pulse rounded-xl mb-8" />
            <div className="h-64 bg-muted/50 animate-pulse rounded-2xl" />
          </div>
        ) : meeting ? (
          <>
            {/* Title and date */}
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground mb-4 leading-tight">
                {meeting.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium bg-muted/30 w-fit px-3 py-1.5 rounded-lg border border-border/50">
                <Calendar className="h-4 w-4" />
                {format(parseISO(meeting.date), 'EEEE, MMMM d, yyyy')}
              </div>
            </div>

            {/* Notes section */}
            <div className="flex flex-col">
              <h3 className="text-lg font-serif font-semibold mb-4 text-foreground/80">Notes</h3>
              <div className="bg-card border border-border shadow-sm rounded-3xl p-6 min-h-[180px]">
                {meeting.notes ? (
                  <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-headings:font-serif">
                    {meeting.notes.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 last:mb-0 text-foreground/90">
                        {paragraph || <br />}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[120px] text-muted-foreground italic text-sm">
                    No notes recorded for this meeting.
                  </div>
                )}
              </div>
            </div>

            {/* Materials section — placeholder, upload functionality coming in a future task */}
            <div className="flex flex-col">
              <h3 className="text-lg font-serif font-semibold mb-4 text-foreground/80">Materials</h3>
              <div className="bg-card border border-border border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[160px]">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <Paperclip className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="font-medium text-foreground/70 text-sm">No materials yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    File uploads will be available in an upcoming update.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Meeting not found.
          </div>
        )}
      </main>
    </div>
  );
}
