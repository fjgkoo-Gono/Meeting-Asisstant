import { Router, type IRouter, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { fetchProjectContext } from "../lib/project-context";
import { fetchMeetingContext } from "../lib/meeting-context";

const router: IRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(scope: "meeting" | "project"): string {
  return `Eres un asistente inteligente especializado en analizar materiales de reuniones de trabajo.

Tu objetivo es ayudar al usuario a entender el contenido de ${scope === "meeting" ? "esta reunión" : "todas las reuniones de este proyecto"}, identificar acuerdos, decisiones y cambios a lo largo del tiempo.

REGLAS IMPORTANTES:
1. SIEMPRE cita la fuente de cada dato: menciona el nombre de la reunión y su fecha entre paréntesis, por ejemplo: (Reunión: "Kickoff", 15 de enero de 2025).
2. Si detectas que un acuerdo o decisión de una reunión anterior fue modificado o contradice una reunión posterior, indícalo EXPLÍCITAMENTE. Por ejemplo: "En la reunión del 3 de enero acordaron X, pero en la del 15 de febrero lo cambiaron a Y".
3. Si no tienes información suficiente para responder con certeza, dilo claramente.
4. Responde siempre en el mismo idioma que el usuario utiliza para preguntar.
5. Usa formato markdown: negritas para conceptos clave, listas para enumerar puntos, y citas para fragmentos relevantes.
6. Sé conciso pero completo. Prioriza la precisión sobre la exhaustividad.
7. Si los materiales no tienen texto extraído (están en procesamiento o fallaron), indícalo.`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Replace generic "Speaker N:" labels in a transcript with the real names
 * stored in speaker_map (e.g. {"1": "Ana", "2": "Pedro"}).
 */
function applySpeakerMap(text: string, speakerMap: Record<string, string> | null | undefined): string {
  if (!speakerMap) return text;
  let result = text;
  for (const [num, name] of Object.entries(speakerMap)) {
    if (name.trim()) {
      result = result.replace(new RegExp(`Speaker ${num}:`, "g"), `${name.trim()}:`);
    }
  }
  return result;
}

// ── Context builders ──────────────────────────────────────────────────────────

async function buildMeetingContext(
  projectId: number,
  meetingId: number,
): Promise<{ context: string; valid: boolean; error?: string }> {
  const data = await fetchMeetingContext(projectId, meetingId);
  if (!data.ok) return { context: "", valid: false, error: data.error };
  const { project, meeting, materials: mats } = data;

  const lines: string[] = [
    `# Proyecto: ${project.name}`,
    project.description ? `Descripción del proyecto: ${project.description}` : "",
    "",
    `## Reunión: "${meeting.title}"`,
    `Fecha: ${meeting.date}`,
    meeting.notes ? `Notas de la reunión:\n${meeting.notes}` : "Sin notas.",
    "",
    `### Materiales de la reunión (${mats.length} total):`,
  ];

  if (mats.length === 0) {
    lines.push("No hay materiales en esta reunión.");
  } else {
    for (const m of mats) {
      lines.push(`\n#### Material: ${m.original_name} (tipo: ${m.type})`);
      if (m.context_note) lines.push(`Nota de contexto del usuario: ${m.context_note}`);
      if (m.status === "processing") lines.push("[Aún en procesamiento — texto no disponible]");
      else if (m.status === "error") lines.push("[Error al extraer el texto de este material]");
      else if (m.extracted_text) lines.push(applySpeakerMap(m.extracted_text, m.speaker_map).slice(0, 8000));
      else lines.push("[Sin texto extraído]");
    }
  }

  return { context: lines.filter(Boolean).join("\n"), valid: true };
}

async function buildProjectContext(
  projectId: number,
): Promise<{ context: string; valid: boolean; error?: string }> {
  const data = await fetchProjectContext(projectId);
  if (!data) return { context: "", valid: false, error: "Project not found" };

  const lines: string[] = [
    `# Proyecto: ${data.project.name}`,
    data.project.description ? `Descripción del proyecto: ${data.project.description}` : "",
    "",
    `## Reuniones del proyecto (${data.meetings.length} total, ordenadas cronológicamente):`,
  ];

  for (const meeting of data.meetings) {
    lines.push(`\n### Reunión: "${meeting.title}" — Fecha: ${meeting.date}`);
    if (meeting.notes) lines.push(`Notas:\n${meeting.notes}`);

    if (meeting.materials.length === 0) {
      lines.push("(Sin materiales adjuntos)");
    } else {
      for (const m of meeting.materials) {
        lines.push(`\n#### Material: ${m.original_name} (tipo: ${m.type})`);
        if (m.status === "processing") lines.push("[Aún en procesamiento]");
        else if (m.status === "error") lines.push("[Error al extraer]");
        else if (m.extracted_text) lines.push(applySpeakerMap(m.extracted_text, m.speaker_map).slice(0, 4000));
        else lines.push("[Sin texto extraído]");
      }
    }
  }

  return { context: lines.join("\n"), valid: true };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function saveChatMessage(
  contextType: "meeting" | "project",
  contextId: number,
  role: "user" | "assistant",
  content: string,
) {
  await supabase
    .from("chat_messages")
    .insert({ context_type: contextType, context_id: contextId, role, content });
}

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── GET /projects/:projectId/meetings/:meetingId/chat ─────────────────────────

router.get(
  "/projects/:projectId/meetings/:meetingId/chat",
  async (req, res): Promise<void> => {
    const projectId = Number(req.params.projectId);
    const meetingId = Number(req.params.meetingId);
    if (!projectId || !meetingId) { res.status(400).json({ error: "Invalid IDs" }); return; }

    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("context_type", "meeting")
      .eq("context_id", meetingId)
      .order("created_at", { ascending: true });

    res.json(data ?? []);
  },
);

// ── POST /projects/:projectId/meetings/:meetingId/chat ────────────────────────

router.post(
  "/projects/:projectId/meetings/:meetingId/chat",
  async (req, res): Promise<void> => {
    const projectId = Number(req.params.projectId);
    const meetingId = Number(req.params.meetingId);
    const { message, history = [] } = req.body as {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message?.trim()) { res.status(400).json({ error: "message is required" }); return; }

    const { context, valid, error } = await buildMeetingContext(projectId, meetingId);
    if (!valid) { res.status(404).json({ error }); return; }

    await saveChatMessage("meeting", meetingId, "user", message);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const claudeMessages: Anthropic.Messages.MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    let fullResponse = "";
    try {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: `${buildSystemPrompt("meeting")}\n\n## CONTEXTO DE LA REUNIÓN:\n\n${context}`,
        messages: claudeMessages,
      });

      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          fullResponse += chunk.delta.text;
          sendSSE(res, "delta", { text: chunk.delta.text });
        }
      }

      await saveChatMessage("meeting", meetingId, "assistant", fullResponse);
      sendSSE(res, "done", { content: fullResponse });
    } catch (err) {
      logger.error({ err }, "Claude streaming error (meeting chat)");
      sendSSE(res, "error", { message: "Error al generar respuesta" });
    } finally {
      res.end();
    }
  },
);

// ── GET /projects/:projectId/chat ─────────────────────────────────────────────

router.get("/projects/:projectId/chat", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!projectId) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("context_type", "project")
    .eq("context_id", projectId)
    .order("created_at", { ascending: true });

  res.json(data ?? []);
});

// ── POST /projects/:projectId/chat ────────────────────────────────────────────

router.post("/projects/:projectId/chat", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const { message, history = [] } = req.body as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message?.trim()) { res.status(400).json({ error: "message is required" }); return; }

  const { context, valid, error } = await buildProjectContext(projectId);
  if (!valid) { res.status(404).json({ error }); return; }

  await saveChatMessage("project", projectId, "user", message);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const claudeMessages: Anthropic.Messages.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  let fullResponse = "";
  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: `${buildSystemPrompt("project")}\n\n## CONTEXTO DEL PROYECTO (todas las reuniones):\n\n${context}`,
      messages: claudeMessages,
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        fullResponse += chunk.delta.text;
        sendSSE(res, "delta", { text: chunk.delta.text });
      }
    }

    await saveChatMessage("project", projectId, "assistant", fullResponse);
    sendSSE(res, "done", { content: fullResponse });
  } catch (err) {
    logger.error({ err }, "Claude streaming error (project chat)");
    sendSSE(res, "error", { message: "Error al generar respuesta" });
  } finally {
    res.end();
  }
});

export default router;
