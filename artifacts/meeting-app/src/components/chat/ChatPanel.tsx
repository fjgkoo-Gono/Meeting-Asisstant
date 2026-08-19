import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBubble } from './ChatBubble';
import { getBaseUrl, getAuthHeaders } from '@/lib/api';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatPanelProps {
  /** Full API path, e.g. /api/projects/1/chat or /api/projects/1/meetings/2/chat */
  chatEndpoint: string;
  /** Display hint shown when chat is empty */
  placeholder?: string;
}

export function ChatPanel({ chatEndpoint, placeholder }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history
  useEffect(() => {
    setHistoryLoading(true);
    fetch(`${getBaseUrl()}${chatEndpoint}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then((data: { role: string; content: string; id: number }[]) => {
        if (Array.isArray(data)) {
          setMessages(
            data.map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [chatEndpoint]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const assistantMsg: Message = { role: 'assistant', content: '', isStreaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setLoading(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Build history (exclude the just-added streaming placeholder)
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(`${getBaseUrl()}${chatEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ message: text, history }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error('API error');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (currentEvent === 'delta' && payload.text !== undefined) {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.isStreaming) {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + payload.text,
                    };
                  }
                  return updated;
                });
              } else if (currentEvent === 'error') {
                throw new Error(payload.message ?? 'Error del servidor');
              }
            } catch (parseErr) {
              if (currentEvent === 'error') throw parseErr;
              // ignore other parse errors
            }
            currentEvent = '';
          }
        }
      }

      // Mark done
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.isStreaming) {
          updated[updated.length - 1] = { ...last, isStreaming: false };
        }
        return updated;
      });
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.isStreaming) {
          updated[updated.length - 1] = {
            ...last,
            content: 'Lo siento, ocurrió un error al generar la respuesta. Inténtalo de nuevo.',
            isStreaming: false,
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, chatEndpoint]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (historyLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 max-w-md md:max-w-xl lg:max-w-2xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">IA</span>
            </div>
            <p className="font-semibold text-foreground/80">Asistente IA</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {placeholder ??
                'Pregúntame sobre los materiales de esta reunión. Por ejemplo: "¿Qué se decidió sobre el presupuesto?" o "Resume los puntos clave".'}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatBubble
              key={idx}
              role={msg.role}
              content={msg.content}
              isStreaming={msg.isStreaming}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-md px-4 py-3 pb-safe">
        <div className="flex items-end gap-2 max-w-md md:max-w-xl lg:max-w-2xl mx-auto">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Escribe tu pregunta…"
            className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 overflow-hidden leading-relaxed"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <Button
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
            disabled={!input.trim() || loading}
            onClick={sendMessage}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
