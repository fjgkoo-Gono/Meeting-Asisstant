import { Router, type IRouter } from "express";
import { eq, desc, count, max, sql } from "drizzle-orm";
import { db, projectsTable, meetingsTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  GetProjectResponse,
  CreateProjectResponse,
  ListProjectsResponseItem,
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
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.createdAt));
  res.json(ListProjectsResponse.parse(projects));
});

// POST /projects
router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning();

  res.status(201).json(CreateProjectResponse.parse(project));
});

// GET /projects/:projectId
router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(GetProjectResponse.parse(project));
});

// DELETE /projects/:projectId
router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.status(204).send();
});

// PATCH /projects/:projectId
router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateProjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if ("description" in body.data) updates.description = body.data.description ?? null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(projectsTable)
    .set(updates)
    .where(eq(projectsTable.id, params.data.projectId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(UpdateProjectResponse.parse(updated));
});

// GET /projects/:projectId/summary
router.get("/projects/:projectId/summary", async (req, res): Promise<void> => {
  const params = GetProjectSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [stats] = await db
    .select({
      meetingCount: count(meetingsTable.id),
      latestMeetingDate: max(meetingsTable.date),
    })
    .from(meetingsTable)
    .where(eq(meetingsTable.projectId, params.data.projectId));

  res.json(
    GetProjectSummaryResponse.parse({
      id: project.id,
      name: project.name,
      description: project.description,
      meetingCount: stats?.meetingCount ?? 0,
      latestMeetingDate: stats?.latestMeetingDate ?? null,
      createdAt: project.createdAt,
    }),
  );
});

// GET /stats
router.get("/stats", async (_req, res): Promise<void> => {
  const [totalProjectsRow] = await db
    .select({ count: count() })
    .from(projectsTable);

  const [totalMeetingsRow] = await db
    .select({ count: count() })
    .from(meetingsTable);

  const recentMeetings = await db
    .select({
      id: meetingsTable.id,
      projectId: meetingsTable.projectId,
      title: meetingsTable.title,
      date: meetingsTable.date,
      projectName: projectsTable.name,
    })
    .from(meetingsTable)
    .innerJoin(projectsTable, eq(meetingsTable.projectId, projectsTable.id))
    .orderBy(desc(meetingsTable.date))
    .limit(5);

  res.json(
    GetStatsResponse.parse({
      totalProjects: totalProjectsRow?.count ?? 0,
      totalMeetings: totalMeetingsRow?.count ?? 0,
      recentMeetings,
    }),
  );
});

export default router;
