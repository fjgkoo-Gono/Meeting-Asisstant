import { Router, type IRouter } from "express";
import { supabase, toCamel, rowsToCamel } from "../lib/supabase";
import { deleteStorageFilesAsync } from "../lib/cleanup";
import { logger } from "../lib/logger";
import {
  CreateMeetingBody,
  CreateMeetingParams,
  GetMeetingParams,
  ListMeetingsParams,
  GetMeetingResponse,
  CreateMeetingResponse,
  ListMeetingsResponse,
  UpdateMeetingBody,
  UpdateMeetingParams,
  UpdateMeetingResponse,
  DeleteMeetingParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /projects/:projectId/meetings
router.get("/projects/:projectId/meetings", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = ListMeetingsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  // Verify project exists and belongs to the caller
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("id")
    .eq("id", params.data.projectId)
    .eq("user_id", userId)
    .single();
  if (pErr || !project) { res.status(404).json({ error: "Project not found" }); return; }

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("project_id", params.data.projectId)
    .order("date", { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(ListMeetingsResponse.parse(rowsToCamel(data ?? [])));
});

// POST /projects/:projectId/meetings
router.post("/projects/:projectId/meetings", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = CreateMeetingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = CreateMeetingBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  // Verify project exists and belongs to the caller
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("id")
    .eq("id", params.data.projectId)
    .eq("user_id", userId)
    .single();
  if (pErr || !project) { res.status(404).json({ error: "Project not found" }); return; }

  // Normalize date to YYYY-MM-DD string
  const rawDate = body.data.date;
  const dateStr =
    rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate);

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      project_id: params.data.projectId,
      title: body.data.title,
      date: dateStr,
      notes: body.data.notes ?? null,
    })
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(CreateMeetingResponse.parse(toCamel(data)));
});

// GET /projects/:projectId/meetings/:meetingId
router.get("/projects/:projectId/meetings/:meetingId", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = GetMeetingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { data, error } = await supabase
    .from("meetings")
    .select("*, projects!inner(user_id)")
    .eq("id", params.data.meetingId)
    .eq("project_id", params.data.projectId)
    .eq("projects.user_id", userId)
    .single();
  if (error || !data) { res.status(404).json({ error: "Meeting not found" }); return; }
  const { projects: _projects, ...meeting } = data as typeof data & { projects: unknown };
  res.json(GetMeetingResponse.parse(toCamel(meeting)));
});

// PATCH /projects/:projectId/meetings/:meetingId
router.patch("/projects/:projectId/meetings/:meetingId", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = UpdateMeetingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = UpdateMeetingBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", params.data.projectId)
    .eq("user_id", userId)
    .single();
  if (!project) { res.status(404).json({ error: "Meeting not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (body.data.title !== undefined) updates.title = body.data.title;
  if (body.data.date !== undefined) {
    const rawDate = body.data.date;
    updates.date =
      rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate);
  }
  if ("notes" in body.data) updates.notes = body.data.notes ?? null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const { data, error } = await supabase
    .from("meetings")
    .update(updates)
    .eq("id", params.data.meetingId)
    .eq("project_id", params.data.projectId)
    .select()
    .single();
  if (error || !data) { res.status(404).json({ error: "Meeting not found" }); return; }
  res.json(UpdateMeetingResponse.parse(toCamel(data)));
});

// DELETE /projects/:projectId/meetings/:meetingId
router.delete("/projects/:projectId/meetings/:meetingId", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const params = DeleteMeetingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", params.data.projectId)
    .eq("user_id", userId)
    .single();
  if (!project) { res.status(404).json({ error: "Meeting not found" }); return; }

  // Fetch material filenames before the cascade-delete wipes them from DB
  const { data: materials, error: matErr } = await supabase
    .from("materials")
    .select("id, filename")
    .eq("meeting_id", params.data.meetingId)
    .not("filename", "is", null);
  if (matErr) {
    logger.warn({ err: matErr, meetingId: params.data.meetingId }, "Failed to fetch materials before meeting delete");
  }

  const { data, error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", params.data.meetingId)
    .eq("project_id", params.data.projectId)
    .select()
    .single();
  if (error || !data) { res.status(404).json({ error: "Meeting not found" }); return; }

  // Clean up stored files asynchronously (non-blocking)
  deleteStorageFilesAsync(materials ?? []);

  res.status(204).send();
});

export default router;
