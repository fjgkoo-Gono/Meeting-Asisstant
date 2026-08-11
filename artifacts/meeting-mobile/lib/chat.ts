import { fetch } from 'expo/fetch';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

let msgCounter = 0;
export function generateId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

interface SSEBlock {
  event: string;
  data: string;
}

function parseSSEBlocks(text: string): { blocks: SSEBlock[]; remaining: string } {
  const blocks: SSEBlock[] = [];
  const parts = text.split('\n\n');
  const remaining = parts.pop() ?? '';

  for (const part of parts) {
    if (!part.trim()) continue;
    const lines = part.split('\n');
    let event = 'message';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      else if (line.startsWith('data: ')) data = line.slice(6);
    }
    if (data) blocks.push({ event, data });
  }

  return { blocks, remaining };
}

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
}

export async function streamMeetingChat(
  projectId: number,
  meetingId: number,
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  onDelta: (text: string) => void,
  onError?: (msg: string) => void,
): Promise<void> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/projects/${projectId}/meetings/${meetingId}/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { blocks, remaining } = parseSSEBlocks(buffer);
    buffer = remaining;

    for (const { event, data } of blocks) {
      try {
        const parsed = JSON.parse(data);
        if (event === 'delta' && parsed.text) onDelta(parsed.text);
        else if (event === 'error' && onError) onError(parsed.message ?? 'Error');
      } catch {
        // ignore malformed JSON
      }
    }
  }
}

export async function streamProjectChat(
  projectId: number,
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  onDelta: (text: string) => void,
  onError?: (msg: string) => void,
): Promise<void> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/projects/${projectId}/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { blocks, remaining } = parseSSEBlocks(buffer);
    buffer = remaining;

    for (const { event, data } of blocks) {
      try {
        const parsed = JSON.parse(data);
        if (event === 'delta' && parsed.text) onDelta(parsed.text);
        else if (event === 'error' && onError) onError(parsed.message ?? 'Error');
      } catch {
        // ignore
      }
    }
  }
}

export async function fetchMeetingChatHistory(
  projectId: number,
  meetingId: number,
): Promise<ChatMessage[]> {
  const baseUrl = getBaseUrl();
  const res = await globalThis.fetch(
    `${baseUrl}/api/projects/${projectId}/meetings/${meetingId}/chat`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data as { role: string; content: string }[]).map((m) => ({
    id: generateId(),
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
}

export async function fetchProjectChatHistory(projectId: number): Promise<ChatMessage[]> {
  const baseUrl = getBaseUrl();
  const res = await globalThis.fetch(`${baseUrl}/api/projects/${projectId}/chat`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data as { role: string; content: string }[]).map((m) => ({
    id: generateId(),
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
}
