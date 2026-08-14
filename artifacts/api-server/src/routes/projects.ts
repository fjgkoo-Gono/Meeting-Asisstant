import { Router, type IRouter } from "express";
import { supabase, toCamel, rowsToCamel } from "../lib/supabase";
import { deleteStorageFilesAsync } from "../lib/cleanup";
import { logger } from "../lib/logger";
import {
  CreateProjectBody,
  GetProjectParams,
  GetProjectResponse,
  CreateProjectResponse,
  ListProjectsResponse,
  GetProjectSummaryParams,
  GetProjectSummaryResponse,
  GetStatsResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /projects
router.get("/projects", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(ListProjectsResponse.parse(rowsToCamel(data ?? [])));
});

// POST /projects
router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { data, error } = await supabase
    .from("projects")
    .insert({ name: parsed.data.name, description: parsed.data.description ?? null })
    .select()
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(CreateProjectResponse.parse(toCamel(data)));
});

// GET /projects/:projectId
router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.data.projectId)
    .single();
  if (error || !data) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(GetProjectResponse.parse(toCamel(data)));
});

// DELETE /projects/:projectId
router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  // Fetch all material filenames across every meeting in this project before
  // the cascade-delete wipes them from DB. We join through meetings via the
  // meetings(project_id) foreign key.
  const { data: materials, error: matErr } = await supabase
    .from("materials")
    .select("id, filename, meeting_id, meetings!inner(project_id)")
    .eq("meetings.project_id", params.data.projectId)
    .not("filename", "is", null);
  if (matErr) {
    logger.warn({ err: matErr, projectId: params.data.projectId }, "Failed to fetch materials before project delete");
  }

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", params.data.projectId)
    .select()
    .single();
  if (error || !data) { res.status(404).json({ error: "Project not found" }); return; }

  // Clean up stored files asynchronously (non-blocking)
  deleteStorageFilesAsync(materials ?? []);

  res.status(204).send();
});

// PATCH /projects/:projectId
router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = UpdateProjectBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if ("description" in body.data) updates.description = body.data.description ?? null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", params.data.projectId)
    .select()
    .single();
  if (error || !data) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(UpdateProjectResponse.parse(toCamel(data)));
});

// GET /projects/:projectId/summary
router.get("/projects/:projectId/summary", async (req, res): Promise<void> => {
  const params = GetProjectSummaryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.data.projectId)
    .single();
  if (pErr || !project) { res.status(404).json({ error: "Project not found" }); return; }

  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, date")
    .eq("project_id", params.data.projectId);

  const meetingList = meetings ?? [];
  const latestMeetingDate = meetingList.length
    ? meetingList.map((m: { date: string }) => m.date).sort().reverse()[0]
    : null;

  res.json(
    GetProjectSummaryResponse.parse({
      id: project.id,
      name: project.name,
      description: project.description,
      meetingCount: meetingList.length,
      latestMeetingDate,
      createdAt: project.created_at,
    }),
  );
});

// GET /stats
router.get("/stats", async (_req, res): Promise<void> => {
  const [
    { count: totalProjects },
    { count: totalMeetings },
    { data: recentMeetingRows },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("meetings").select("*", { count: "exact", head: true }),
    supabase
      .from("meetings")
      .select("id, project_id, title, date")
      .order("date", { ascending: false })
      .limit(5),
  ]);

  // Fetch project names for the recent meetings
  const projectIds = [...new Set((recentMeetingRows ?? []).map((m: { project_id: number }) => m.project_id))];
  const { data: projectRows } = projectIds.length
    ? await supabase.from("projects").select("id, name").in("id", projectIds)
    : { data: [] };
  const projectMap = Object.fromEntries(
    (projectRows ?? []).map((p: { id: number; name: string }) => [p.id, p.name]),
  );

  const recentMeetings = (recentMeetingRows ?? []).map((m: { id: number; project_id: number; title: string; date: string }) => ({
    id: m.id,
    projectId: m.project_id,
    title: m.title,
    date: m.date,
    projectName: projectMap[m.project_id] ?? "",
  }));

  res.json(
    GetStatsResponse.parse({
      totalProjects: totalProjects ?? 0,
      totalMeetings: totalMeetings ?? 0,
      recentMeetings,
    }),
  );
});

export default router;
