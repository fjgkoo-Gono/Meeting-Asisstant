/**
 * Shared batched fetch of a project with its meetings and each meeting's
 * materials — used by both the project chat (chat.ts) and the timeline
 * endpoint (projects.ts) so they don't duplicate the N+1-safe query pattern.
 */
import { supabase } from "./supabase";

export interface ProjectContextMaterial {
  id: number;
  type: string;
  original_name: string;
  extracted_text: string | null;
  status: string;
  speaker_map: Record<string, string> | null;
}

export interface ProjectContextMeeting {
  id: number;
  project_id: number;
  title: string;
  date: string;
  notes: string | null;
  materials: ProjectContextMaterial[];
}

export interface ProjectContextData {
  project: { id: number; name: string; description: string | null };
  meetings: ProjectContextMeeting[];
}

export async function fetchProjectContext(projectId: number, userId: string): Promise<ProjectContextData | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  if (!project) return null;

  const { data: meetings } = await supabase
    .from("meetings")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: true });

  const meetingList = meetings ?? [];
  const meetingIds = meetingList.map((m) => m.id);
  const { data: allMaterials } = meetingIds.length
    ? await supabase
        .from("materials")
        .select("*")
        .in("meeting_id", meetingIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const materialsByMeeting = new Map<number, ProjectContextMaterial[]>();
  for (const m of allMaterials ?? []) {
    const list = materialsByMeeting.get(m.meeting_id) ?? [];
    list.push(m);
    materialsByMeeting.set(m.meeting_id, list);
  }

  return {
    project: { id: project.id, name: project.name, description: project.description },
    meetings: meetingList.map((m) => ({ ...m, materials: materialsByMeeting.get(m.id) ?? [] })),
  };
}
