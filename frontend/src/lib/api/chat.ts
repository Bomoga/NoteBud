const AUTH_STORE_KEY = 'notebud-auth';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface ChatCitation {
  chunk_id: string;
  filename: string;
  snippet: string;
  source_type: 'document' | 'note';
  notebook_title?: string | null;
}

export interface ChatDoneEvent {
  done: true;
  citations: ChatCitation[];
  low_confidence: boolean;
}

export interface ChatTokenEvent {
  token: string;
}

export type ChatEvent = ChatTokenEvent | ChatDoneEvent;

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Stream a RAG chat response via SSE.
 * Calls `onEvent` for each parsed SSE payload until done or aborted.
 */
export async function streamChat(
  notebookId: string,
  query: string,
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}/notebooks/${notebookId}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep last (possibly incomplete) line in buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const payload = JSON.parse(jsonStr) as ChatEvent;
          onEvent(payload);
        } catch {
          // malformed SSE line — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
