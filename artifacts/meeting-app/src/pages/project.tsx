import { useGetProject, useListMeetings, useCreateMeeting, getGetProjectQueryKey, getListMeetingsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { ChevronLeft, Plus, Calendar, FileText, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function ProjectDetail() {
  const [, params] = useRoute('/projects/:id');
  const projectId = Number(params?.id);
  
  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });
  
  const { data: meetings, isLoading: meetingsLoading } = useListMeetings(projectId, {
    query: { enabled: !!projectId, queryKey: getListMeetingsQueryKey(projectId) }
  });

  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);

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

        <div className="flex-col flex gap-3 pb-8">
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
              <Link key={meeting.id} href={`/projects/${projectId}/meetings/${meeting.id}`}>
                <div className="group flex flex-col p-4 bg-card rounded-2xl border border-border shadow-sm active-elevate hover-elevate transition-all cursor-pointer gap-3">
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
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
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
