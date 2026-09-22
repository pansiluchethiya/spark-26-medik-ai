// Shared chat types (mirror web src/types/app.ts subset).

export type ChatRole = 'user' | 'assistant';

export type VerifiedSource = {
  id: string;
  title: string;
  url: string;
  domain: string;
  quality: string;
  type?: string;
};

export type ChatMessage = {
  role: ChatRole;
  content: string;
  warning?: string;
  sources?: VerifiedSource[];
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};
