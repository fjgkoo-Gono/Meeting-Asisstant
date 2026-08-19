import { Router, type IRouter } from "express";
import { supabase, rowsToCamel } from "../lib/supabase";
import { SearchResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const SNIPPET_RADIUS = 80;

/** Short excerpt around the first match of `query` inside `text`. */
function makeSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, SNIPPET_RADIUS * 2).trim();
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(text.length, idx + query.length + SNIPPET_RADIUS);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

// GET /search?q=...
router.get("/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) { res.status(400).json({ error: "q is required" }); return; }

  const like = `%${q}%`;

  const [
    { data: projByName },
    { data: projByDesc },
    { data: meetingRows },
    { data: matByText },
    { data: matByNote },
  ] = await Promise.all([
    supabase.from("projects").select("id, name, description").ilike("name", like),
    supabase.from("projects").select("id, name, description").ilike("description", like),
    supabase.from("meetings").select("id, project_id, title, date").ilike("title", like),
    supabase.from("materials").select("id, meeting_id, extracted_text, context_note").ilike("extracted_text", like),
    supabase.from("materials").select("id, meeting_id, extracted_text, context_note").ilike("context_note", like),
  ]);

  // Dedupe projects matched by name and/or description
  const projectById = new Map<number, { id: number; name: string; description: string | null }>();
  for (const p of [...(projByName ?? []), ...(projByDesc ?? [])]) projectById.set(p.id, p);

  // Meetings matched directly by title
  const meetingById = new Map<number, { id: number; project_id: number; title: string; date: string }>();
  for (const m of meetingRows ?? []) meetingById.set(m.id, m);

  // Materials matched by extracted text or context note — resolve to their meeting
  const materialHits = [...(matByText ?? []), ...(matByNote ?? [])];
  const materialMeetingIds = [...new Set(materialHits.map((m) => m.meeting_id))];
  const { data: materialMeetings } = materialMeetingIds.length
    ? await supabase.from("meetings").select("id, project_id, title, date").in("id", materialMeetingIds)
    : { data: [] as { id: number; project_id: number; title: string; date: string }[] };
  for (const m of materialMeetings ?? []) {
    if (!meetingById.has(m.id)) meetingById.set(m.id, m);
  }

  // Snippet per meeting, from the first material whose text actually contains the query
  const snippetByMeeting = new Map<number, string>();
  for (const mat of materialHits) {
    if (snippetByMeeting.has(mat.meeting_id)) continue;
    const lowerQ = q.toLowerCase();
    const source =
      mat.extracted_text?.toLowerCase().includes(lowerQ) ? mat.extracted_text :
      mat.context_note?.toLowerCase().includes(lowerQ) ? mat.context_note :
      null;
    if (source) snippetByMeeting.set(mat.meeting_id, makeSnippet(source, q));
  }

  // Resolve project names for every meeting involved
  const projectIds = [...new Set([...projectById.keys(), ...[...meetingById.values()].map((m) => m.project_id)])];
  const { data: projectNames } = projectIds.length
    ? await supabase.from("projects").select("id, name").in("id", projectIds)
    : { data: [] as { id: number; name: string }[] };
  const projectNameById = new Map((projectNames ?? []).map((p) => [p.id, p.name]));

  const meetings = [...meetingById.values()]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((m) => ({
      id: m.id,
      projectId: m.project_id,
      projectName: projectNameById.get(m.project_id) ?? "",
      title: m.title,
      date: m.date,
      snippet: snippetByMeeting.get(m.id) ?? null,
    }));

  res.json(
    SearchResponse.parse({
      projects: rowsToCamel([...projectById.values()]),
      meetings,
    }),
  );
});

export default router;
