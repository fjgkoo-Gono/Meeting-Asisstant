import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, projectsTable, meetingsTable } from "@workspace/db";
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
  const params = ListMeetingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify project exists
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const meetings = await db
    .select()
    .from(meetingsTable)
    .where(eq(meetingsTable.projectId, params.data.projectId))
    .orderBy(desc(meetingsTable.date));

  res.json(ListMeetingsResponse.parse(meetings));
});

// POST /projects/:projectId/meetings
router.post("/projects/:projectId/meetings", async (req, res): Promise<void> => {
  const params = CreateMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateMeetingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Verify project exists
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Orval coerces date strings to Date objects (useDates: true in orval config),
  // but Drizzle's date column in "string" mode expects YYYY-MM-DD strings.
  const rawDate = body.data.date;
  const dateStr =
    rawDate instanceof Date
      ? rawDate.toISOString().slice(0, 10)
      : String(rawDate);

  const [meeting] = await db
    .insert(meetingsTable)
    .values({
      projectId: params.data.projectId,
      title: body.data.title,
      date: dateStr,
      notes: body.data.notes ?? null,
    })
    .returning();

  res.status(201).json(CreateMeetingResponse.parse(meeting));
});

// GET /projects/:projectId/meetings/:meetingId
router.get("/projects/:projectId/meetings/:meetingId", async (req, res): Promise<void> => {
  const params = GetMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [meeting] = await db
    .select()
    .from(meetingsTable)
    .where(
      and(
        eq(meetingsTable.id, params.data.meetingId),
        eq(meetingsTable.projectId, params.data.projectId),
      ),
    );

  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  res.json(GetMeetingResponse.parse(meeting));
});

// PATCH /projects/:projectId/meetings/:meetingId
router.patch("/projects/:projectId/meetings/:meetingId", async (req, res): Promise<void> => {
  const params = UpdateMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateMeetingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Build update object with only provided fields
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

  const [updated] = await db
    .update(meetingsTable)
    .set(updates)
    .where(
      and(
        eq(meetingsTable.id, params.data.meetingId),
        eq(meetingsTable.projectId, params.data.projectId),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  res.json(UpdateMeetingResponse.parse(updated));
});

// DELETE /projects/:projectId/meetings/:meetingId
router.delete("/projects/:projectId/meetings/:meetingId", async (req, res): Promise<void> => {
  const params = DeleteMeetingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(meetingsTable)
    .where(
      and(
        eq(meetingsTable.id, params.data.meetingId),
        eq(meetingsTable.projectId, params.data.projectId),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Meeting not found" });
    return;
  }

  res.status(204).send();
});

export default router;
