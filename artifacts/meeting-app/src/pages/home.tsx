import { useListProjects, useCreateProject } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListProjectsQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Plus, Folder, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

export default function Home() {
  const { data: projects, isLoading } = useListProjects();
  const [search, setSearch] = useState('');
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  return (
    <div className="flex-1 flex flex-col pt-safe px-4 py-6 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif font-bold text-foreground">Projects</h1>
        <NewProjectDialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen} />
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search projects..." 
          className="pl-9 bg-card border-border rounded-xl h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
            <Folder className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium text-foreground mb-1">No projects yet</p>
            <p className="text-sm">Create a project to start taking meeting notes.</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="group flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-sm active-elevate hover-elevate transition-all cursor-pointer">
                <div className="flex flex-col gap-1 pr-4">
                  <h3 className="font-medium text-base text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
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
      <DialogContent className="sm:max-w-[425px] rounded-t-3xl sm:rounded-3xl mt-auto sm:mt-0 pt-safe">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">New Project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Acme Corp Redesign" className="rounded-xl" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief context about this project..." 
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
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
