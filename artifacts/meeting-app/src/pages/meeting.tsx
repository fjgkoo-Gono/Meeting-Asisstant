import { useState, useRef, useCallback } from 'react';
import {
  useGetMeeting,
  useGetProject,
  getGetProjectQueryKey,
  getGetMeetingQueryKey,
  useListMaterials,
  getListMaterialsQueryKey,
  createMaterial,
  retryMaterial,
  uploadFileMaterial,
} from '@workspace/api-client-react';
import type { Material, MaterialType } from '@workspace/api-client-react';
import { Link, useRoute } from 'wouter';
import {
  ChevronLeft,
  Calendar,
  Paperclip,
  Camera,
  ImageIcon,
  FileText,
  Table2,
  AlignLeft,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────

type FileMaterialType = Extract<MaterialType, 'photo' | 'image' | 'pdf' | 'excel'>;

const FILE_TYPE_CONFIG: Record<
  FileMaterialType,
  { label: string; icon: React.ElementType; accept: string; capture?: string }
> = {
  photo: { label: 'Cámara', icon: Camera, accept: 'image/*', capture: 'environment' },
  image: { label: 'Imagen', icon: ImageIcon, accept: 'image/*' },
  pdf: { label: 'PDF', icon: FileText, accept: '.pdf,application/pdf' },
  excel: {
    label: 'Excel / CSV',
    icon: Table2,
    accept:
      '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv',
  },
};

const TYPE_ICON: Record<MaterialType, React.ElementType> = {
  photo: Camera,
  image: ImageIcon,
  pdf: FileText,
  excel: Table2,
  text: AlignLeft,
};

function StatusBadge({ status }: { status: Material['status'] }) {
  if (status === 'processing')
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
        <Loader2 className="h-3 w-3 animate-spin" /> Procesando…
      </span>
    );
  if (status === 'ready')
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle2 className="h-3 w-3" /> Listo
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-destructive font-medium">
      <AlertCircle className="h-3 w-3" /> Error
    </span>
  );
}

// ── Text modal ────────────────────────────────────────────────────────────

function TextMaterialModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, content: string) => void;
}) {
  const [name, setName] = useState('Transcripción');
  const [content, setContent] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 flex flex-col gap-4 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Añadir texto / transcripción</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Nombre (ej. Transcripción reunión)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <textarea
          className="w-full h-48 rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Pega o escribe el texto aquí…"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <Button
          className="w-full rounded-2xl"
          disabled={!content.trim()}
          onClick={() => {
            onSave(name || 'Transcripción', content);
            onClose();
          }}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

// ── Add material bottom sheet ─────────────────────────────────────────────

function AddMaterialSheet({
  onClose,
  onFileSelect,
  onTextSelect,
  uploading,
}: {
  onClose: () => void;
  onFileSelect: (type: FileMaterialType, file: File) => void;
  onTextSelect: () => void;
  uploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<FileMaterialType | null>(null);

  const handleTypeClick = (type: FileMaterialType | 'text') => {
    if (type === 'text') {
      onTextSelect();
      return;
    }
    setPendingType(type);
    if (fileInputRef.current) {
      const cfg = FILE_TYPE_CONFIG[type];
      fileInputRef.current.accept = cfg.accept;
      if (cfg.capture) {
        fileInputRef.current.setAttribute('capture', cfg.capture);
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingType) {
      onFileSelect(pendingType, file);
    }
  };

  const allEntries = [
    ...Object.entries(FILE_TYPE_CONFIG).map(([type, cfg]) => ({
      type: type as FileMaterialType | 'text',
      ...cfg,
    })),
    { type: 'text' as const, label: 'Texto / transcripción', icon: AlignLeft, accept: '' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-foreground">Añadir material</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2">
          {allEntries.map(({ type, label, icon: Ic }) => (
            <button
              key={type}
              disabled={uploading}
              onClick={() => handleTypeClick(type)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-muted/30 hover:bg-muted/60 active:scale-95 transition-all disabled:opacity-50"
            >
              <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                <Ic className="h-5 w-5 text-foreground/70" />
              </div>
              <span className="text-xs font-medium text-foreground/80 text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>

        {uploading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo…
          </div>
        )}

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  );
}

// ── Material card ─────────────────────────────────────────────────────────

function MaterialCard({
  material,
  onRetry,
}: {
  material: Material;
  onRetry: (id: number) => void;
}) {
  const Ic = TYPE_ICON[material.type] ?? Paperclip;
  return (
    <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-2xl px-4 py-3">
      <div className="h-9 w-9 rounded-xl bg-background flex items-center justify-center shadow-sm shrink-0">
        <Ic className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{material.originalName}</p>
        <StatusBadge status={material.status} />
      </div>
      {material.status === 'error' && (
        <button
          onClick={() => onRetry(material.id)}
          className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          title="Reintentar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function MeetingDetail() {
  const [, params] = useRoute('/projects/:projectId/meetings/:meetingId');
  const projectId = Number(params?.projectId);
  const meetingId = Number(params?.meetingId);

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: meeting, isLoading } = useGetMeeting(projectId, meetingId, {
    query: {
      enabled: !!(projectId && meetingId),
      queryKey: getGetMeetingQueryKey(projectId, meetingId),
    },
  });

  const { data: materials = [] } = useListMaterials(projectId, meetingId, {
    query: {
      enabled: !!(projectId && meetingId),
      queryKey: getListMaterialsQueryKey(projectId, meetingId),
      // Poll while any material is still processing
      refetchInterval: (query) => {
        const data = query.state.data as Material[] | undefined;
        return data?.some(m => m.status === 'processing') ? 2000 : false;
      },
    },
  });

  const queryClient = useQueryClient();
  const [showSheet, setShowSheet] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const invalidateMaterials = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey(projectId, meetingId) });
  }, [queryClient, projectId, meetingId]);

  const handleFileSelect = useCallback(
    async (type: FileMaterialType, file: File) => {
      setShowSheet(false);
      setUploading(true);
      try {
        await uploadFileMaterial(projectId, meetingId, type, file);
        invalidateMaterials();
        toast.success('Material añadido');
      } catch {
        toast.error('Error al subir el archivo. Inténtalo de nuevo.');
      } finally {
        setUploading(false);
      }
    },
    [projectId, meetingId, invalidateMaterials],
  );

  const handleTextSave = useCallback(
    async (name: string, content: string) => {
      setShowTextModal(false);
      setUploading(true);
      try {
        await createMaterial(projectId, meetingId, { type: 'text', name, content });
        invalidateMaterials();
        toast.success('Texto añadido');
      } catch {
        toast.error('Error al guardar el texto. Inténtalo de nuevo.');
      } finally {
        setUploading(false);
      }
    },
    [projectId, meetingId, invalidateMaterials],
  );

  const handleRetry = useCallback(
    async (materialId: number) => {
      try {
        await retryMaterial(projectId, meetingId, materialId);
        invalidateMaterials();
      } catch {
        toast.error('Error al reintentar. Inténtalo de nuevo.');
      }
    },
    [projectId, meetingId, invalidateMaterials],
  );

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
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Project
            </span>
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
                {format(parseISO(meeting.date as unknown as string), 'EEEE, MMMM d, yyyy')}
              </div>
            </div>

            {/* Notes section */}
            <div className="flex flex-col">
              <h3 className="text-lg font-serif font-semibold mb-4 text-foreground/80">Notes</h3>
              <div className="bg-card border border-border shadow-sm rounded-3xl p-6 min-h-[180px]">
                {meeting.notes ? (
                  <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-headings:font-serif">
                    {(meeting.notes as string).split('\n').map((paragraph, idx) => (
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

            {/* Materials section */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif font-semibold text-foreground/80">Materiales</h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-1.5 h-8 text-xs"
                  disabled={uploading}
                  onClick={() => setShowSheet(true)}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Añadir
                </Button>
              </div>

              {materials.length === 0 ? (
                <div className="bg-card border border-border border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[160px]">
                  <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                    <Paperclip className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground/70 text-sm">Sin materiales</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Toca "Añadir" para subir fotos, PDFs, Excel o transcripciones.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {materials.map(m => (
                    <MaterialCard key={m.id} material={m} onRetry={handleRetry} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">Meeting not found.</div>
        )}
      </main>

      {showSheet && (
        <AddMaterialSheet
          onClose={() => setShowSheet(false)}
          onFileSelect={handleFileSelect}
          onTextSelect={() => {
            setShowSheet(false);
            setShowTextModal(true);
          }}
          uploading={uploading}
        />
      )}

      {showTextModal && (
        <TextMaterialModal
          onClose={() => setShowTextModal(false)}
          onSave={handleTextSave}
        />
      )}
    </div>
  );
}
