import { useListProjects, useCreateProject, useDeleteProject, useSearch } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListProjectsQueryKey, getSearchQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Plus, Folder, ChevronRight, Search, Trash2, Sun, Moon, MessageSquare, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { Project } from '@workspace/api-client-react';

/** Debounce a fast-changing value so we don't fire a request per keystroke. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function Home() {
  const { data: projects, isLoading } = useListProjects({ query: { queryKey: getListProjectsQueryKey(), refetchInterval: 30_000 } });
  const [search, setSearch] = useState('');
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const isSearching = debouncedSearch.length > 0;
  const { data: searchResults, isLoading: isSearchLoading } = useSearch(
    { q: debouncedSearch },
    { query: { queryKey: getSearchQueryKey({ q: debouncedSearch }), enabled: isSearching } },
  );

  return (
    <div className="flex-1 flex flex-col pt-safe px-4 py-6 max-w-md md:max-w-xl lg:max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif font-bold text-foreground">Proyectos</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => signOut()}
            className="md:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
          <NewProjectDialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen} />
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proyectos, reuniones o contenido..."
          className="pl-9 bg-card border-border rounded-xl h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {isSearching ? (
          isSearchLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : !searchResults?.projects.length && !searchResults?.meetings.length ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium text-foreground mb-1">Sin resultados</p>
              <p className="text-sm">No encontramos nada para "{debouncedSearch}".</p>
            </div>
          ) : (
            <>
              {searchResults.projects.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Proyectos</h2>
                  {searchResults.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border shadow-sm hover-elevate active-elevate transition-all cursor-pointer"
                    >
                      <Folder className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base text-foreground truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {searchResults.meetings.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Reuniones</h2>
                  {searchResults.meetings.map((meeting) => (
                    <Link
                      key={meeting.id}
                      href={`/projects/${meeting.projectId}/meetings/${meeting.id}`}
                      className="flex flex-col gap-1.5 p-4 bg-card rounded-2xl border border-border shadow-sm hover-elevate active-elevate transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium text-base text-foreground truncate">{meeting.title}</h3>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-primary/70">{meeting.projectName}</span>
                        <span>&bull;</span>
                        <span>{format(parseISO(meeting.date as unknown as string), "d 'de' MMM, yyyy", { locale: es })}</span>
                      </div>
                      {meeting.snippet && (
                        <p className="text-xs text-muted-foreground/80 leading-relaxed flex items-start gap-1.5 mt-1">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{meeting.snippet}</span>
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : !projects?.length ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
            <Folder className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium text-foreground mb-1">Todavía no hay proyectos</p>
            <p className="text-sm">Crea un proyecto para empezar a registrar reuniones.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="group relative flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-sm hover-elevate transition-all">
              <Link href={`/projects/${project.id}`} className="flex-1 flex items-center gap-3 min-w-0 active-elevate cursor-pointer">
                <div className="flex flex-col gap-1 pr-2 min-w-0">
                  <h3 className="font-medium text-base text-foreground group-hover:text-primary transition-colors truncate">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setProjectToDelete(project);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                  aria-label="Eliminar proyecto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link href={`/projects/${project.id}`}>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <DeleteProjectDialog
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
      />
    </div>
  );
}

function DeleteProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { mutate: deleteProject, isPending } = useDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        onClose();
      },
    },
  });

  return (
    <Dialog open={!!project} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[400px] rounded-t-3xl sm:rounded-3xl mt-auto sm:mt-0 pt-safe">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">¿Eliminar proyecto?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">"{project?.name}"</span> y todas sus reuniones y archivos subidos se eliminarán permanentemente. Esto no se puede deshacer.
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
            onClick={() => project && deleteProject({ projectId: project.id })}
          >
            {isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formSchema = z.object({
  name: z.string().min(1, "El nombre del proyecto es obligatorio"),
  description: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

function NewProjectDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const createProject = useCreateProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" }
  });

  const onSubmit = (data: FormValues) => {
    createProject.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        onOpenChange(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) form.reset();
    }}>
      <DialogTrigger asChild>
        <Button size="icon" className="rounded-full h-10 w-10 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-t-3xl sm:rounded-3xl mt-auto sm:mt-0 pt-safe max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Nuevo proyecto</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del proyecto</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Rediseño Acme Corp" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve contexto sobre este proyecto..."
                      className="rounded-xl resize-none"
                      rows={3}
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
              disabled={createProject.isPending}
            >
              {createProject.isPending ? 'Creando...' : 'Crear proyecto'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
