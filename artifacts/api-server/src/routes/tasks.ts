import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { supabase, toCamel, rowsToCamel } from "../lib/supabase";
import { fetchMeetingContext } from "../lib/meeting-context";
import { logger } from "../lib/logger";
import {
  ListMeetingTasksParams,
  ListMeetingTasksResponse,
  CreateMeetingTaskParams,
  CreateMeetingTaskBody,
  CreateMeetingTaskResponse,
  UpdateMeetingTaskParams,
  UpdateMeetingTaskBody,
  UpdateMeetingTaskResponse,
  DeleteMeetingTaskParams,
  ExtractMeetingTasksParams,
  ExtractMeetingTasksResponse,
  ListTasksQueryParams,
  ListTasksResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

type ResolveError = { ok: false; error: string; status: 404 };
type ResolveSuccess = { ok: true };

async function resolveMeeting(projectId: number, meetingId: number): Promise<ResolveError | ResolveSuccess> {
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).single();
  if (!project) return { ok: false, error: "Project not found", status: 404 };

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", meetingId)
    .eq("project_id", projectId)
    .single();
  if (!meeting) return { ok: false, error: "Meeting not found", status: 404 };

  return { ok: true };
}

// GET /projects/:projectId/meetings/:meetingId/tasks
router.get("/projects/:projectId/meetings/:meetingId/tasks", async (req, res): Promise<void> => {
  const params = ListMeetingTasksParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
  if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("meeting_id", params.data.meetingId)
    .order("completed", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(ListMeetingTasksResponse.parse(rowsToCamel(data ?? [])));
});

// POST /projects/:projectId/meetings/:meetingId/tasks
router.post("/projects/:projectId/meetings/:meetingId/tasks", async (req, res): Promise<void> => {
  const params = CreateMeetingTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = CreateMeetingTaskBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
  if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      meeting_id: params.data.meetingId,
      description: body.data.description,
      assignee: body.data.assignee?.trim() || null,
    })
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(CreateMeetingTaskResponse.parse(toCamel(data)));
});

// PATCH /projects/:projectId/meetings/:meetingId/tasks/:taskId
router.patch("/projects/:projectId/meetings/:meetingId/tasks/:taskId", async (req, res): Promise<void> => {
  const params = UpdateMeetingTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = UpdateMeetingTaskBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (body.data.description !== undefined) updates.description = body.data.description;
  if ("assignee" in body.data) updates.assignee = body.data.assignee?.trim() || null;
  if (body.data.completed !== undefined) updates.completed = body.data.completed;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", params.data.taskId)
    .eq("meeting_id", params.data.meetingId)
    .select()
    .single();
  if (error || !data) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(UpdateMeetingTaskResponse.parse(toCamel(data)));
});

// DELETE /projects/:projectId/meetings/:meetingId/tasks/:taskId
router.delete("/projects/:projectId/meetings/:meetingId/tasks/:taskId", async (req, res): Promise<void> => {
  const params = DeleteMeetingTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", params.data.taskId)
    .eq("meeting_id", params.data.meetingId)
    .select()
    .single();
  if (error || !data) { res.status(404).json({ error: "Task not found" }); return; }
  res.status(204).send();
});

// ── AI extraction ────────────────────────────────────────────────────────────

const EXTRACT_SYSTEM_PROMPT = `Eres un asistente que revisa el contenido de una reunión (notas y materiales transcritos) y extrae tareas o acuerdos accionables — cosas concretas que alguien se comprometió a hacer.

Reglas:
- Solo tareas realmente accionables (compromisos, pendientes, acciones a seguir). No incluyas temas de discusión general ni datos sin acción asociada.
- "assignee" solo si la reunión menciona explícitamente quién es responsable (nombre de persona). Si no está claro, omite el campo.
- Descripciones concisas, en español, una acción por tarea.
- Si no hay tareas accionables claras, devuelve una lista vacía — no inventes.`;

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "emit_tasks",
  description: "Emite la lista de tareas accionables encontradas en la reunión.",
  input_schema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            assignee: { type: "string" },
          },
          required: ["description"],
        },
      },
    },
    required: ["tasks"],
  },
};

// POST /projects/:projectId/meetings/:meetingId/tasks/extract
router.post("/projects/:projectId/meetings/:meetingId/tasks/extract", async (req, res): Promise<void> => {
  const params = ExtractMeetingTasksParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const context = await fetchMeetingContext(params.data.projectId, params.data.meetingId);
  if (!context.ok) { res.status(404).json({ error: context.error }); return; }

  const materialsText = context.materials.length === 0
    ? "(sin materiales)"
    : context.materials
        .map((m) => {
          if (m.status !== "ready" || !m.extracted_text) return `- ${m.original_name}: [sin texto disponible]`;
          return `- ${m.original_name}: ${m.extracted_text.slice(0, 6000)}`;
        })
        .join("\n");

  const userContent = [
    `Reunión: "${context.meeting.title}" — ${context.meeting.date}`,
    context.meeting.notes ? `Notas: ${context.meeting.notes}` : "",
    "Materiales:",
    materialsText,
  ].filter(Boolean).join("\n");

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "emit_tasks" },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("Claude did not return a tool_use block");

    const parsed = toolUse.input as { tasks: Array<{ description: string; assignee?: string }> };
    const rowsToInsert = parsed.tasks
      .filter((t) => t.description?.trim())
      .map((t) => ({
        meeting_id: params.data.meetingId,
        description: t.description.trim(),
        assignee: t.assignee?.trim() || null,
      }));

    if (rowsToInsert.length === 0) {
      res.json(ExtractMeetingTasksResponse.parse({ tasks: [] }));
      return;
    }

    const { data, error } = await supabase.from("tasks").insert(rowsToInsert).select();
    if (error) { res.status(500).json({ error: error.message }); return; }

    res.json(ExtractMeetingTasksResponse.parse({ tasks: rowsToCamel(data ?? []) }));
  } catch (err) {
    logger.error({ err, projectId: params.data.projectId, meetingId: params.data.meetingId }, "Failed to extract tasks");
    res.status(500).json({ error: "Failed to extract tasks" });
  }
});

// ── Global list ───────────────────────────────────────────────────────────────

// GET /tasks
router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const { projectId, meetingId, assignee } = query.data;

  // zod.coerce.boolean() does `Boolean(value)`, so the string "false" (as sent
  // in a query string) coerces to `true` — parse the raw query value instead.
  const completedRaw = req.query.completed;
  const completed = completedRaw === undefined ? undefined : completedRaw === "true";

  let dbQuery = supabase
    .from("tasks")
    .select("*, meetings!inner(id, title, date, project_id, projects!inner(id, name))")
    .order("completed", { ascending: true })
    .order("created_at", { ascending: false });

  if (meetingId !== undefined) dbQuery = dbQuery.eq("meeting_id", meetingId);
  if (assignee !== undefined) dbQuery = dbQuery.eq("assignee", assignee);
  if (completed !== undefined) dbQuery = dbQuery.eq("completed", completed);
  if (projectId !== undefined) dbQuery = dbQuery.eq("meetings.project_id", projectId);

  const { data, error } = await dbQuery;
  if (error) { res.status(500).json({ error: error.message }); return; }

  type Row = {
    id: number;
    description: string;
    assignee: string | null;
    completed: boolean;
    created_at: string;
    meetings: { id: number; title: string; date: string; project_id: number; projects: { id: number; name: string } };
  };

  const results = (data as unknown as Row[] ?? []).map((row) => ({
    id: row.id,
    meetingId: row.meetings.id,
    meetingTitle: row.meetings.title,
    meetingDate: row.meetings.date,
    projectId: row.meetings.project_id,
    projectName: row.meetings.projects.name,
    description: row.description,
    assignee: row.assignee,
    completed: row.completed,
    createdAt: row.created_at,
  }));

  res.json(ListTasksResponse.parse(results));
});

export default router;
