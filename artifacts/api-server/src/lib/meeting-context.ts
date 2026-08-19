/**
 * Shared fetch of a single meeting with its project and materials — used by
 * the meeting chat (chat.ts) and the task-extraction endpoint (tasks.ts) so
 * they don't duplicate the same three-query lookup.
 */
import { supabase } from "./supabase";

export interface MeetingContextMaterial {
  id: number;
  type: string;
  original_name: string;
  extracted_text: string | null;
  context_note: string | null;
  speaker_map: Record<string, string> | null;
  status: string;
}

export interface MeetingContextData {
  project: { id: number; name: string; description: string | null };
  meeting: { id: number; title: string; date: string; notes: string | null };
  materials: MeetingContextMaterial[];
}

export type MeetingContextResult =
  | ({ ok: true } & MeetingContextData)
  | { ok: false; error: "Project not found" | "Meeting not found" };

export async function fetchMeetingContext(
  projectId: number,
  meetingId: number,
): Promise<MeetingContextResult> {
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (!project) return { ok: false, error: "Project not found" };

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .eq("project_id", projectId)
    .single();
  if (!meeting) return { ok: false, error: "Meeting not found" };

  const { data: materials } = await supabase
    .from("materials")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  return {
    ok: true,
    project: { id: project.id, name: project.name, description: project.description },
    meeting: { id: meeting.id, title: meeting.title, date: meeting.date, notes: meeting.notes },
    materials: materials ?? [],
  };
}
