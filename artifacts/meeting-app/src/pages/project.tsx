import { useGetProject, useListMeetings, useCreateMeeting, useDeleteMeeting, getGetProjectQueryKey, getListMeetingsQueryKey } from '@workspace/api-client-react';
import type { ListMeetingsQueryResult } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link, useRoute } from 'wouter';
import { ChevronLeft, Plus, Calendar, FileText, ChevronRight, MessageSquare, X, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

export default function ProjectDetail() {
  const [, params] = useRoute('/projects/:id');
  const projectId = Number(params?.id);
  const [showProjectChat, setShowProjectChat] = useState(false);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: meetings, isLoading: meetingsLoading } = useListMeetings(projectId, {
    query: { enabled: !!projectId, queryKey: getListMeetingsQueryKey(projectId) }
  });

  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

  return (
    <div className="flex flex-col min-h-screen pt-safe bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto w-full">
          <Link href="/">
            <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10 rounded-full">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex-1 px-2 overflow-hidden">
            <h1 className="text-base font-semibold truncate text-center">
              {project?.name ?? 'Project'}
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

      <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
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
          <h3 className="text-lg font-serif font-semibold">Meetings</h3>
          <div className="text-sm text-muted-foreground">{meetings?.length ?? 0} total</div>
        </div>

        <div className="flex-col flex gap-3 pb-28">
          {meetingsLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-2xl" />
            ))
          ) : !meetings?.length ? (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border border-dashed rounded-2xl">
              <Calendar className="h-10 w-10 mb-3 mx-auto opacity-20" />
              <p className="font-medium text-foreground mb-1">No meetings yet</p>
              <p className="text-sm">Record your first meeting for this project.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={() => setIsNewMeetingOpen(true)}
              >
                Add Meeting
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
                      <span>{format(parseISO(meeting.date), 'MMM d, yyyy')}</span>
                    </div>
                    {meeting.notes && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Notes attached</span>
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMeetingToDelete(meeting); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-3 self-start m-1 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
                  aria-label="Delete meeting"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Floating "Consultar proyecto" button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 pb-safe">
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
          <DialogTitle className="font-serif text-xl">Delete meeting?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">"{meeting?.title}"</span> and all its uploaded files will be permanently deleted. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 mt-4 sm:flex-row">
          <Button variant="outline" className="rounded-xl flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl flex-1"
            disabled={isPending}
            onClick={() => meeting && deleteMeeting({ projectId, meetingId: meeting.id })}
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
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
          <DialogTitle className="font-serif text-xl">New Meeting</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4 overflow-y-auto pr-2 pb-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Kickoff with Client" className="rounded-xl" {...field} />
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
                  <FormLabel>Date</FormLabel>
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
                  <FormLabel>Initial Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Jot down some initial thoughts..."
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
              {createMeeting.isPending ? 'Saving...' : 'Save Meeting'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
