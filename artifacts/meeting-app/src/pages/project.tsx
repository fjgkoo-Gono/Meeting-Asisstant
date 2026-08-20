import { useGetProject, useListMeetings, useCreateMeeting, useDeleteMeeting, useGetProjectTimeline, getGetProjectQueryKey, getListMeetingsQueryKey, getGetProjectTimelineQueryKey } from '@workspace/api-client-react';
import type { ListMeetingsQueryResult } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link, useRoute } from 'wouter';
import { ChevronLeft, Plus, Calendar, FileText, ChevronRight, MessageSquare, X, Trash2, History, Loader2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ChatPanel } from '@/components/chat/ChatPanel';

// ── Project Chat Sheet ─────────────────────────────────────────────────────

function ProjectChatSheet({
  projectId,
  projectName,
  onClose,
}: {
  projectId: number;
  projectName: string;
  onClose: () => void;
}) {
  const chatEndpoint = `/api/projects/${projectId}/chat`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Sheet header */}
      <div className="shrink-0 flex items-center h-14 px-4 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors -ml-2"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
            {projectName}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Asistente IA del Proyecto
          </span>
        </div>
        <div className="w-9" />
      </div>

      {/* Chat panel fills the remaining height */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatPanel
          chatEndpoint={chatEndpoint}
          placeholder='Pregúntame sobre cualquier reunión de este proyecto. Por ejemplo: "¿Qué acordamos sobre el presupuesto en las últimas reuniones?" o "¿Hubo cambios respecto al plan inicial?"'
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type Meeting = ListMeetingsQueryResult[number];

type ProjectView = 'meetings' | 'timeline';

export default function ProjectDetail() {
  const [, params] = useRoute('/projects/:id');
  const projectId = Number(params?.id);
  const [showProjectChat, setShowProjectChat] = useState(false);
  const [view, setView] = useState<ProjectView>('meetings');

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: meetings, isLoading: meetingsLoading } = useListMeetings(projectId, {
    query: { enabled: !!projectId, queryKey: getListMeetingsQueryKey(projectId) }
  });

  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-full pt-safe bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4 max-w-md md:max-w-xl lg:max-w-2xl mx-auto w-full">
          <Link href="/">
            <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10 rounded-full">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex-1 px-2 overflow-hidden">
            <h1 className="text-base font-semibold truncate text-center">
              {project?.name ?? 'Proyecto'}
            </h1>
          </div>
          <div className="w-10 flex justify-end">
            {project && (
              <NewMeetingDialog
                projectId={projectId}
                open={isNewMeetingOpen}
                onOpenChange={setIsNewMeetingOpen}
              />
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 py-6 max-w-md md:max-w-xl lg:max-w-2xl mx-auto w-full">
        {projectLoading ? (
          <div className="h-20 bg-muted/50 animate-pulse rounded-2xl mb-8" />
        ) : (
          <div className="mb-8">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-2">{project?.name}</h2>
            {project?.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView('meetings')}
              className={`px-3 py-1.5 rounded-full text-sm font-serif font-semibold transition-colors ${
                view === 'meetings' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Reuniones
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-serif font-semibold transition-colors ${
                view === 'timeline' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Línea de tiempo
            </button>
          </div>
          {view === 'meetings' && (
            <div className="text-sm text-muted-foreground">{meetings?.length ?? 0} en total</div>
          )}
        </div>

        {view === 'timeline' ? (
          <ProjectTimeline projectId={projectId} />
        ) : (
        <div className="flex-col flex gap-3 pb-28">
          {meetingsLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-2xl" />
            ))
          ) : !meetings?.length ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border border-dashed rounded-2xl">
              <Calendar className="h-10 w-10 mb-3 mx-auto opacity-20" />
              <p className="font-medium text-foreground mb-1">Todavía no hay reuniones</p>
              <p className="text-sm">Registra la primera reunión de este proyecto.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={() => setIsNewMeetingOpen(true)}
              >
                Agregar reunión
              </Button>
            </div>
          ) : (
            meetings.map((meeting) => (
              <div key={meeting.id} className="group relative flex bg-card rounded-2xl border border-border shadow-sm hover-elevate transition-all overflow-hidden">
                <Link href={`/projects/${projectId}/meetings/${meeting.id}`} className="flex-1 flex flex-col p-4 gap-3 active-elevate cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-medium text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {meeting.title}
                    </h4>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(parseISO(meeting.date), "d 'de' MMM, yyyy", { locale: es })}</span>
                    </div>
                    {meeting.notes && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Con notas</span>
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMeetingToDelete(meeting); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-3 self-start m-1 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
                  aria-label="Eliminar reunión"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
        )}
      </main>

      {/* Floating "Consultar proyecto" button — sits above the mobile bottom tab bar */}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-20 pb-safe">
        <button
          onClick={() => setShowProjectChat(true)}
          className="flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 active:scale-95 transition-all font-medium text-sm"
        >
          <MessageSquare className="h-4 w-4" />
          Consultar proyecto con IA
        </button>
      </div>

      {/* Project chat sheet */}
      {showProjectChat && (
        <ProjectChatSheet
          projectId={projectId}
          projectName={project?.name ?? 'Proyecto'}
          onClose={() => setShowProjectChat(false)}
        />
      )}

      <DeleteMeetingDialog
        meeting={meetingToDelete}
        projectId={projectId}
        onClose={() => setMeetingToDelete(null)}
      />
    </div>
  );
}

function DeleteMeetingDialog({ meeting, projectId, onClose }: { meeting: Meeting | null; projectId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { mutate: deleteMeeting, isPending } = useDeleteMeeting({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey(projectId) });
        onClose();
      },
      onError: () => {
        toast.error('Error al eliminar la reunión. Inténtalo de nuevo.');
      },
    },
  });

  return (
    <Dialog open={!!meeting} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[400px] rounded-t-3xl sm:rounded-3xl mt-auto sm:mt-0 pt-safe">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">¿Eliminar reunión?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">"{meeting?.title}"</span> y todos sus archivos subidos se eliminarán permanentemente. Esto no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 mt-4 sm:flex-row">
          <Button variant="outline" className="rounded-xl flex-1" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl flex-1"
            disabled={isPending}
            onClick={() => meeting && deleteMeeting({ projectId, meetingId: meeting.id })}
          >
            {isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
  notes: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

function NewMeetingDialog({ projectId, open, onOpenChange }: { projectId: number, open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const createMeeting = useCreateMeeting();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: ""
    }
  });

  const onSubmit = (data: FormValues) => {
    createMeeting.mutate({ projectId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey(projectId) });
        onOpenChange(false);
        form.reset({
          title: "",
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: ""
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) {
        form.reset({
          title: "",
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: ""
        });
      }
    }}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 text-primary hover:bg-primary/10">
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-t-3xl sm:rounded-3xl mt-auto sm:mt-0 pt-safe flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Nueva reunión</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4 overflow-y-auto pr-2 pb-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título de la reunión</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Kickoff con el cliente" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas iniciales (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anota algunas ideas iniciales..."
                      className="rounded-xl resize-none min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full rounded-xl mt-4 h-12 text-base font-medium"
              disabled={createMeeting.isPending}
            >
              {createMeeting.isPending ? 'Guardando...' : 'Guardar reunión'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Timeline view ────────────────────────────────────────────────────────────
//
// Generated live by Claude each time this tab is opened (no caching) — reads
// the whole project's meetings + materials, so it can take a few seconds and
// costs a real API call. Highlights a meeting when it changes or contradicts
// something from an earlier one.

function ProjectTimeline({ projectId }: { projectId: number }) {
  const { data, isLoading, isError } = useGetProjectTimeline(projectId, {
    query: { queryKey: getGetProjectTimelineQueryKey(projectId) },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 pb-28">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analizando el historial del proyecto...
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-card border border-border border-dashed rounded-2xl">
        <p className="text-sm">No se pudo generar la línea de tiempo. Inténtalo de nuevo.</p>
      </div>
    );
  }

  if (data.entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-card border border-border border-dashed rounded-2xl">
        <History className="h-10 w-10 mb-3 mx-auto opacity-20" />
        <p className="text-sm">Todavía no hay reuniones para mostrar en la línea de tiempo.</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-6 py-2 pl-6 pb-28">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
      {data.entries.map((entry) => (
        <Link key={entry.meetingId} href={`/projects/${projectId}/meetings/${entry.meetingId}`} className="relative block group">
          <div
            className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${
              entry.changeFromPrevious ? 'bg-amber-500' : 'bg-primary'
            }`}
          />
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{entry.title}</h4>
            <span className="text-xs text-muted-foreground shrink-0">
              {format(parseISO(entry.date as unknown as string), "d 'de' MMM, yyyy", { locale: es })}
            </span>
          </div>
          {entry.highlight && (
            <p className="text-sm text-muted-foreground leading-relaxed">{entry.highlight}</p>
          )}
          {entry.changeFromPrevious && (
            <div className="mt-2 flex items-start gap-1.5 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{entry.changeFromPrevious}</span>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
