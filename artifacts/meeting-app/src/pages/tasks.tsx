import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  useListTasks,
  useListProjects,
  useListMeetings,
  useUpdateMeetingTask,
  getListTasksQueryKey,
  getListMeetingsQueryKey,
} from '@workspace/api-client-react';
import type { ListTasksParams } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ListTodo, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CompletedFilter = 'pending' | 'completed' | 'all';

const ALL = '__all__';

export default function Tasks() {
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [meetingId, setMeetingId] = useState<number | undefined>(undefined);
  const [assignee, setAssignee] = useState<string | undefined>(undefined);
  const [completedFilter, setCompletedFilter] = useState<CompletedFilter>('pending');

  const { data: projects } = useListProjects();
  const { data: meetingsForProject } = useListMeetings(projectId ?? 0, {
    query: { enabled: !!projectId, queryKey: getListMeetingsQueryKey(projectId ?? 0) },
  });

  // Unfiltered fetch, just to derive the full set of assignees for the dropdown
  // (independent of the active filters, so options don't shrink as you filter).
  const { data: allTasks } = useListTasks({}, { query: { queryKey: getListTasksQueryKey({}) } });
  const assignees = useMemo(
    () => [...new Set((allTasks ?? []).map((t) => t.assignee).filter((a): a is string => !!a))].sort(),
    [allTasks],
  );

  const completed = completedFilter === 'all' ? undefined : completedFilter === 'completed';
  const params: ListTasksParams = { projectId, meetingId, assignee, completed };
  const { data: tasks = [], isLoading } = useListTasks(params, {
    query: { queryKey: getListTasksQueryKey(params) },
  });

  const queryClient = useQueryClient();
  const { mutate: updateTask } = useUpdateMeetingTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      },
      onError: () => toast.error('Error al actualizar la tarea. Inténtalo de nuevo.'),
    },
  });

  return (
    <div className="flex-1 flex flex-col pt-safe px-4 py-6 max-w-md md:max-w-xl lg:max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-serif font-bold text-foreground mb-6">Tareas</h1>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex gap-2">
          <Select
            value={projectId != null ? String(projectId) : ALL}
            onValueChange={(v) => {
              setProjectId(v === ALL ? undefined : Number(v));
              setMeetingId(undefined);
            }}
          >
            <SelectTrigger className="rounded-xl bg-card">
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los proyectos</SelectItem>
              {(projects ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={meetingId != null ? String(meetingId) : ALL}
            onValueChange={(v) => setMeetingId(v === ALL ? undefined : Number(v))}
            disabled={!projectId}
          >
            <SelectTrigger className="rounded-xl bg-card">
              <SelectValue placeholder="Reunión" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las reuniones</SelectItem>
              {(meetingsForProject ?? []).map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={assignee ?? ALL} onValueChange={(v) => setAssignee(v === ALL ? undefined : v)}>
          <SelectTrigger className="rounded-xl bg-card">
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los responsables</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1 bg-muted rounded-full p-1">
          {(['pending', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setCompletedFilter(f)}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors ${
                completedFilter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              {f === 'pending' ? 'Pendientes' : f === 'completed' ? 'Completadas' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 pb-8">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-2xl" />)
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border border-dashed rounded-2xl">
            <ListTodo className="h-10 w-10 mb-3 mx-auto opacity-20" />
            <p className="text-sm">No hay tareas para estos filtros.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border shadow-sm">
              <button
                onClick={() =>
                  updateTask({
                    projectId: task.projectId,
                    meetingId: task.meetingId,
                    taskId: task.id,
                    data: { completed: !task.completed },
                  })
                }
                className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  task.completed ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary'
                }`}
                aria-label={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
              >
                {task.completed && <Check className="h-3 w-3 text-primary-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.description}
                </p>
                <div className="flex items-center flex-wrap gap-2 mt-1.5">
                  {task.assignee && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      <User className="h-3 w-3" />
                      {task.assignee}
                    </span>
                  )}
                  <Link
                    href={`/projects/${task.projectId}/meetings/${task.meetingId}`}
                    className="text-xs text-primary/70 hover:text-primary transition-colors truncate"
                  >
                    {task.projectName} · {task.meetingTitle}
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
