import { Platform } from 'react-native';
import { fetch } from 'expo/fetch';
import type { ChatMessage } from './types';

// Base URL of the Medik AI backend. Overridable at build time:
//   EXPO_PUBLIC_BACKEND_URL=https://api.medik.us.ci npx expo start
export const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.medik.us.ci'
).replace(/\/+$/, '');

export const apiUrl = (path: string) => `${BACKEND_URL}${path}`;

export type StreamEvent =
  | { type: 'token'; token: string }
  | { type: 'warning'; warning: string }
  | { type: 'sources'; sources: ChatMessage['sources'] }
  | { type: 'done' };

export type ChatEvents = {
  onToken?: (token: string) => void;
  onWarning?: (warning: string) => void;
  onSources?: (sources: NonNullable<ChatMessage['sources']>) => void;
};

function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = process.env.EXPO_PUBLIC_BACKEND_API_KEY;
  return {
    'Content-Type': 'application/json',
    'X-App-Platform': `expo-${Platform.OS}`,
    ...(key ? { 'x-api-key': key } : {}),
    ...extra,
  };
}

/** Streaming chat — mirrors web readAssistantStream event shapes.
 * Uses expo/fetch (WinterCG-compliant): response.body streams like browsers. */
export async function sendChatStream(
  messages: Pick<ChatMessage, 'role' | 'content'>[],
  events: ChatEvents = {},
  options: { signal?: AbortSignal; webResearch?: boolean } = {},
): Promise<string> {
  const res = await fetch(apiUrl('/api/v1/ai/chat'), {
    method: 'POST',
    headers: baseHeaders(),
    signal: options.signal,
    body: JSON.stringify({
      messages,
      stream: true,
      webResearch: options.webResearch !== false,
    }),
  });

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = (await res.json()) as {
      message?: ChatMessage;
      error?: { message?: string };
    };
    if (!res.ok || !data.message?.content) {
      throw new Error(data.error?.message ?? 'The triage service returned an empty response.');
    }
    events.onToken?.(data.message.content);
    return data.message.content;
  }

  if (!res.ok || !res.body) {
    throw new Error('The triage service is unreachable. Please try again.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const evt = JSON.parse(line.slice(6)) as {
        token?: string;
        warning?: string;
        sources?: NonNullable<ChatMessage['sources']>;
        done?: boolean;
        error?: string;
      };
      if (evt.error) throw new Error(evt.error);
      if (evt.token) {
        answer += evt.token;
        events.onToken?.(evt.token);
      }
      if (evt.warning) events.onWarning?.(evt.warning);
      if (evt.sources) events.onSources?.(evt.sources);
      if (evt.done) {
        try { await reader.cancel(); } catch { /* already closed */ }
        return answer;
      }
    }
    if (done) return answer;
  }
}

/** Non-streaming chat (simpler, higher latency to first content). */
export async function sendChatOnce(
  messages: Pick<ChatMessage, 'role' | 'content'>[],
): Promise<string> {
  const res = await fetch(apiUrl('/api/v1/ai/chat'), {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({ messages, stream: false }),
  });
  const data = (await res.json()) as {
    message?: ChatMessage;
    error?: { message?: string };
  };
  if (!res.ok || !data.message?.content) {
    throw new Error(data.error?.message ?? 'The triage service could not complete this request.');
  }
  return data.message.content;
}

export async function getHealth(): Promise<{ ok: boolean; service: string }> {
  const res = await fetch(apiUrl('/api/health'));
  if (!res.ok) throw new Error('Backend unreachable');
  return (await res.json()) as { ok: boolean; service: string };
}
