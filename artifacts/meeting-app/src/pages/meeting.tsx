import { useState, useRef, useCallback } from 'react';
import {
  useGetMeeting,
  useGetProject,
  getGetProjectQueryKey,
  getGetMeetingQueryKey,
  useListMaterials,
  getListMaterialsQueryKey,
  useDeleteMeeting,
  useDeleteMaterial,
  getListMeetingsQueryKey,
  createMaterial,
  retryMaterial,
  uploadFileMaterial,
  updateMaterialSpeakers,
} from '@workspace/api-client-react';
import type { Material, MaterialType } from '@workspace/api-client-react';
import { Link, useRoute, useLocation } from 'wouter';
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
  MessageSquare,
  Layers,
  ExternalLink,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Mic,
  Presentation,
  Trash2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChatPanel } from '@/components/chat/ChatPanel';

// ── Speaker helpers ───────────────────────────────────────────────────────

/** Replace "Speaker N:" labels with real names from the stored map. */
function applySpeakerMap(text: string, speakerMap: Record<string, string> | null | undefined): string {
  if (!speakerMap) return text;
  let result = text;
  for (const [num, name] of Object.entries(speakerMap)) {
    if (name.trim()) result = result.replace(new RegExp(`Speaker ${num}:`, 'g'), `${name.trim()}:`);
  }
  return result;
}

/** Parse the unique speaker numbers found in a Gladia transcript. */
function parseDetectedSpeakers(text: string): string[] {
  const found = new Set<string>();
  const re = /^Speaker (\d+):/gm;
  let m;
  while ((m = re.exec(text)) !== null) found.add(m[1]);
  return [...found].sort((a, b) => Number(a) - Number(b));
}

// ── Helpers ───────────────────────────────────────────────────────────────

type FileMaterialType = Extract<MaterialType, 'photo' | 'image' | 'pdf' | 'excel' | 'pptx' | 'audio'>;

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
  pptx: {
    label: 'PowerPoint',
    icon: Presentation,
    accept: '.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint',
  },
  audio: {
    label: 'Audio',
    icon: Mic,
    accept: 'audio/*,.mp3,.m4a,.wav,.ogg,.aac,.webm',
  },
};

const TYPE_ICON: Record<MaterialType, React.ElementType> = {
  photo: Camera,
  image: ImageIcon,
  pdf: FileText,
  excel: Table2,
  pptx: Presentation,
  text: AlignLeft,
  audio: Mic,
};

function StatusBadge({ status, materialType }: { status: Material['status']; materialType: Material['type'] }) {
  if (status === 'processing') {
    const label = materialType === 'audio' ? 'Transcribiendo audio…' : 'Procesando…';
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
        <Loader2 className="h-3 w-3 animate-spin" /> {label}
      </span>
    );
  }
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

// ── Context note modal (shown after selecting a file) ─────────────────────

function ContextNoteModal({
  filename,
  onCancel,
  onConfirm,
}: {
  filename: string;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onCancel}>
      <div
        className="w-full max-w-md mx-auto bg-card rounded-t-3xl p-6 flex flex-col gap-4 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Nota de contexto</h3>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* File badge */}
        <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground/80 truncate">{filename}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Nota opcional para el asistente IA
          </label>
          <textarea
            className="w-full h-28 rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder='Ej: "Presupuesto Q3 aprobado en la junta del martes" o "Foto de la pizarra con el diagrama de flujo"'
            value={note}
            onChange={e => setNote(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl"
            onClick={() => onConfirm('')}
          >
            Omitir
          </Button>
          <Button
            className="flex-1 rounded-2xl"
            onClick={() => onConfirm(note.trim())}
          >
            Subir
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Text modal ────────────────────────────────────────────────────────────

function TextMaterialModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, content: string, contextNote: string) => void;
}) {
  const [name, setName] = useState('Transcripción');
  const [content, setContent] = useState('');
  const [contextNote, setContextNote] = useState('');

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
          className="w-full h-40 rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Pega o escribe el texto aquí…"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <textarea
          className="w-full h-16 rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Nota de contexto para el asistente IA (opcional)"
          value={contextNote}
          onChange={e => setContextNote(e.target.value)}
        />
        <Button
          className="w-full rounded-2xl"
          disabled={!content.trim()}
          onClick={() => {
            onSave(name || 'Transcripción', content, contextNote);
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

// ── Speaker name editor ───────────────────────────────────────────────────

function SpeakerNameEditor({
  material,
  projectId,
  meetingId,
  onSaved,
}: {
  material: Material;
  projectId: number;
  meetingId: number;
  onSaved: () => void;
}) {
  const speakers = parseDetectedSpeakers(material.extractedText ?? '');
  const [names, setNames] = useState<Record<string, string>>(() => {
    const map = material.speakerMap ?? {};
    const result: Record<string, string> = {};
    for (const n of speakers) result[n] = (map as Record<string, string>)[n] ?? '';
    return result;
  });
  const [saving, setSaving] = useState(false);

  if (speakers.length === 0) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMaterialSpeakers(projectId, meetingId, material.id, { speakerMap: names });
      onSaved();
      toast.success('Nombres guardados');
    } catch {
      toast.error('Error al guardar los nombres');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pb-3 border-t border-border/50 pt-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Hablantes detectados
      </p>
      <div className="flex flex-col gap-1.5 mb-3">
        {speakers.map(num => (
          <div key={num} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 shrink-0">Speaker {num}</span>
            <input
              className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Nombre real (opcional)"
              value={names[num] ?? ''}
              onChange={e => setNames(prev => ({ ...prev, [num]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-xl h-7 text-xs"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        Guardar nombres
      </Button>
    </div>
  );
}

// ── Material card ─────────────────────────────────────────────────────────

function MaterialCard({
  material,
  projectId,
  meetingId,
  onRetry,
  onRefresh,
}: {
  material: Material;
  projectId: number;
  meetingId: number;
  onRetry: (id: number) => void;
  onRefresh: () => void;
}) {
  const Ic = TYPE_ICON[material.type] ?? Paperclip;
  const [showText, setShowText] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { mutate: deleteMaterial, isPending: deletePending } = useDeleteMaterial({
    mutation: {
      onSuccess: () => {
        onRefresh();
        toast.success('Material eliminado');
        setShowDeleteConfirm(false);
      },
      onError: () => {
        toast.error('Error al eliminar el material. Inténtalo de nuevo.');
      },
    },
  });

  const hasFile = material.type !== 'text' && material.filename;
  // All file types go through the API proxy route (handles Cloudinary, GCS, and legacy disk).
  const fileUrl = hasFile ? `/api/materials/${material.id}/file` : null;

  // Open file in a new tab via blob fetch so the service worker doesn't
  // intercept the navigation.
  const handleOpen = async () => {
    if (!fileUrl) return;
    const win = window.open('', '_blank');
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (win) {
        win.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      }
    } catch {
      if (win) win.location.href = fileUrl;
    }
  };

  const isAudio = material.type === 'audio';
  const displayText = isAudio && material.extractedText
    ? applySpeakerMap(material.extractedText, material.speakerMap as Record<string, string> | null)
    : material.extractedText;

  return (
    <div className="flex flex-col bg-muted/30 border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-9 w-9 rounded-xl bg-background flex items-center justify-center shadow-sm shrink-0">
          <Ic className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{material.originalName}</p>
          <StatusBadge status={material.status} materialType={material.type} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* View / open */}
          {hasFile && (
            <button
              onClick={handleOpen}
              className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              title="Abrir documento"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}

          {/* Expand text / transcript */}
          {(material.type === 'text' || (isAudio && material.status === 'ready')) && material.extractedText && (
            <button
              onClick={() => setShowText(v => !v)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              title={isAudio ? 'Ver transcripción' : 'Ver contenido'}
            >
              {showText ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}

          {/* Retry */}
          {material.status === 'error' && (
            <button
              onClick={() => onRetry(material.id)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              title="Reintentar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={material.status === 'processing' || deletePending}
            className="p-1.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            title="Eliminar material"
          >
            {deletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Context note */}
      {material.contextNote && (
        <div className="flex items-start gap-2 px-4 pb-3 -mt-1">
          <StickyNote className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground/80 leading-relaxed">{material.contextNote}</p>
        </div>
      )}

      {/* Expanded section */}
      {showText && displayText && (
        <>
          {/* Speaker name editor (audio only) */}
          {isAudio && (
            <SpeakerNameEditor
              material={material}
              projectId={projectId}
              meetingId={meetingId}
              onSaved={onRefresh}
            />
          )}

          {/* Transcript / text */}
          <div className="px-4 pb-4 border-t border-border/50 pt-3">
            {isAudio && (
              <p className="text-xs font-medium text-muted-foreground mb-2">Transcripción</p>
            )}
            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {displayText}
            </p>
          </div>
        </>
      )}

      {/* Delete material confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px] rounded-t-3xl sm:rounded-3xl mt-auto sm:mt-0 pt-safe">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">¿Eliminar material?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">"{material.originalName}"</span> se eliminará permanentemente. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 mt-4 sm:flex-row">
            <Button
              variant="outline"
              className="rounded-xl flex-1"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deletePending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl flex-1"
              disabled={deletePending}
              onClick={() => deleteMaterial({ projectId, meetingId, materialId: material.id })}
            >
              {deletePending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Eliminando…</> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab types ─────────────────────────────────────────────────────────────

type Tab = 'materials' | 'chat';

// ── Pending upload (waiting for context note confirmation) ─────────────────

type PendingUpload = { type: FileMaterialType; file: File };

// ── Main page ─────────────────────────────────────────────────────────────

export default function MeetingDetail() {
  const [, params] = useRoute('/projects/:projectId/meetings/:meetingId');
  const projectId = Number(params?.projectId);
  const meetingId = Number(params?.meetingId);
  const [activeTab, setActiveTab] = useState<Tab>('materials');

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
      refetchInterval: (query) => {
        const data = query.state.data as Material[] | undefined;
        return data?.some(m => m.status === 'processing') ? 2000 : false;
      },
    },
  });

  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { mutate: deleteMeeting, isPending: deleteMeetingPending } = useDeleteMeeting({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey(projectId) });
        navigate(`/projects/${projectId}`);
      },
      onError: () => {
        toast.error('Error al eliminar la reunión. Inténtalo de nuevo.');
        setShowDeleteDialog(false);
      },
    },
  });
  const [showSheet, setShowSheet] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [uploading, setUploading] = useState(false);

  const invalidateMaterials = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey(projectId, meetingId) });
  }, [queryClient, projectId, meetingId]);

  // Step 1: file selected → show context note modal (don't upload yet)
  const handleFileSelect = useCallback((type: FileMaterialType, file: File) => {
    setShowSheet(false);
    setPendingUpload({ type, file });
  }, []);

  // Step 2: user confirmed context note → actually upload
  const handleConfirmUpload = useCallback(
    async (contextNote: string) => {
      if (!pendingUpload) return;
      const { type, file } = pendingUpload;
      setPendingUpload(null);
      setUploading(true);
      try {
        await uploadFileMaterial(projectId, meetingId, type, file, contextNote || undefined);
        invalidateMaterials();
        toast.success('Material añadido');
      } catch {
        toast.error('Error al subir el archivo. Inténtalo de nuevo.');
      } finally {
        setUploading(false);
      }
    },
    [pendingUpload, projectId, meetingId, invalidateMaterials],
  );

  const handleTextSave = useCallback(
    async (name: string, content: string, contextNote: string) => {
      setShowTextModal(false);
      setUploading(true);
      try {
        await createMaterial(projectId, meetingId, {
          type: 'text',
          name,
          content,
          contextNote: contextNote || undefined,
        });
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

  const chatEndpoint = `/api/projects/${projectId}/meetings/${meetingId}/chat`;

  return (
    <div className="flex flex-col h-screen pt-safe bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 shrink-0">
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
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors shrink-0"
            aria-label="Delete meeting"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex max-w-md mx-auto w-full px-4 pb-0 gap-1">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'materials'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Materiales
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'chat'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat IA
          </button>
        </div>
      </header>

      {/* Content */}
      {activeTab === 'chat' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel
            chatEndpoint={chatEndpoint}
            placeholder='Pregúntame sobre los materiales de esta reunión. Por ejemplo: "¿Qué se decidió sobre el presupuesto?" o "Resume los puntos clave".'
          />
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto px-4 py-8 max-w-md mx-auto w-full flex flex-col gap-8 pb-safe">
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full gap-1.5 mt-2 text-xs"
                      onClick={() => setActiveTab('chat')}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Ir al Chat IA
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {materials.map(m => (
                      <MaterialCard
                        key={m.id}
                        material={m}
                        projectId={projectId}
                        meetingId={meetingId}
                        onRetry={handleRetry}
                        onRefresh={invalidateMaterials}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Meeting not found.</div>
          )}
        </main>
      )}

      {/* Overlays */}
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

      {pendingUpload && (
        <ContextNoteModal
          filename={pendingUpload.file.name}
          onCancel={() => setPendingUpload(null)}
          onConfirm={handleConfirmUpload}
        />
      )}

      {showTextModal && (
        <TextMaterialModal
          onClose={() => setShowTextModal(false)}
          onSave={handleTextSave}
        />
      )}

      {/* Delete meeting dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-t-3xl sm:rounded-3xl mt-auto sm:mt-0 pt-safe">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Delete meeting?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">"{meeting?.title}"</span> and all its uploaded files will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 mt-4 sm:flex-row">
            <Button variant="outline" className="rounded-xl flex-1" onClick={() => setShowDeleteDialog(false)} disabled={deleteMeetingPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl flex-1"
              disabled={deleteMeetingPending}
              onClick={() => meeting && deleteMeeting({ projectId, meetingId })}
            >
              {deleteMeetingPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}