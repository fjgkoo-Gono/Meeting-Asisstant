import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fetchProjectContext } from "../lib/project-context";
import { logger } from "../lib/logger";
import { GetProjectTimelineResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `Eres un asistente que arma la línea de tiempo de un proyecto a partir de sus reuniones.

Para cada reunión (ya ordenadas cronológicamente), da:
- "highlight": 1-2 frases con lo más relevante o novedoso de esa reunión.
- "changeFromPrevious": SOLO si algo en esta reunión cambia, contradice, o actualiza explícitamente una decisión o dato de una reunión anterior — describe el cambio en 1 frase. Si no hay un cambio así, omite este campo por completo.

Responde para TODAS las reuniones recibidas, usando su "meetingId" exacto.`;

const TIMELINE_TOOL: Anthropic.Tool = {
  name: "emit_timeline",
  description: "Emite la línea de tiempo estructurada de reuniones del proyecto.",
  input_schema: {
    type: "object",
    properties: {
      entries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            meetingId: { type: "number" },
            highlight: { type: "string" },
            changeFromPrevious: { type: "string" },
          },
          required: ["meetingId", "highlight"],
        },
      },
    },
    required: ["entries"],
  },
};

// GET /projects/:projectId/timeline
router.get("/projects/:projectId/timeline", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const projectId = Number(req.params.projectId);
  if (!projectId) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const data = await fetchProjectContext(projectId, userId);
  if (!data) { res.status(404).json({ error: "Project not found" }); return; }

  if (data.meetings.length === 0) {
    res.json(GetProjectTimelineResponse.parse({ entries: [] }));
    return;
  }

  const meetingsText = data.meetings
    .map((m) => {
      const materialsText =
        m.materials.length === 0
          ? "(sin materiales)"
          : m.materials
              .map((mat) => {
                if (mat.status !== "ready" || !mat.extracted_text) return `- ${mat.original_name}: [sin texto disponible]`;
                return `- ${mat.original_name}: ${mat.extracted_text.slice(0, 3000)}`;
              })
              .join("\n");
      return `### Reunión meetingId=${m.id}: "${m.title}" — ${m.date}\n${m.notes ? `Notas: ${m.notes}\n` : ""}${materialsText}`;
    })
    .join("\n\n");

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Proyecto: ${data.project.name}\n\n${meetingsText}` },
      ],
      tools: [TIMELINE_TOOL],
      tool_choice: { type: "tool", name: "emit_timeline" },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) throw new Error("Claude did not return a tool_use block");

    const parsed = toolUse.input as {
      entries: Array<{ meetingId: number; highlight: string; changeFromPrevious?: string }>;
    };
    const byMeetingId = new Map(parsed.entries.map((e) => [e.meetingId, e]));

    const entries = data.meetings.map((m) => {
      const hit = byMeetingId.get(m.id);
      return {
        meetingId: m.id,
        title: m.title,
        date: m.date,
        highlight: hit?.highlight ?? "",
        changeFromPrevious: hit?.changeFromPrevious || null,
      };
    });

    res.json(GetProjectTimelineResponse.parse({ entries }));
  } catch (err) {
    logger.error({ err, projectId }, "Failed to generate project timeline");
    res.status(500).json({ error: "Failed to generate timeline" });
  }
});

export default router;
