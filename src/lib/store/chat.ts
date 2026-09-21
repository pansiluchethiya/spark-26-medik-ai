import type { ChatMessage, ChatSession } from '../../types/app'
import { chatHistoryKey, chatSessionsKey } from './keys'

// Chat history + sessions.
export function newSession(): ChatSession {
  return { id: crypto.randomUUID(), title: 'New conversation', updatedAt: new Date().toISOString(), messages: [] }
}

export function readChatHistory(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(chatHistoryKey)
    if (!stored) return []
    const parsed = JSON.parse(stored) as ChatMessage[]
    return Array.isArray(parsed) && parsed.every((message) => message && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string') ? parsed : []
  } catch {
    return []
  }
}

export function readChatSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(chatSessionsKey)
    if (stored) {
      const sessions = JSON.parse(stored) as ChatSession[]
      if (Array.isArray(sessions) && sessions.every((session) => session?.id && Array.isArray(session.messages))) {
        return sessions.map((session) => ({ ...session, messages: session.messages.filter((message) => typeof message.content === 'string' && message.content.trim()) }))
      }
    }
    const messages = readChatHistory()
    return [{ ...newSession(), title: messages[0]?.content.slice(0, 42) || 'New conversation', messages }]
  } catch {
    return [newSession()]
  }
}

export function saveChatSessions(sessions: ChatSession[]) {
  localStorage.setItem(chatSessionsKey, JSON.stringify(sessions))
  localStorage.setItem(chatHistoryKey, JSON.stringify(sessions[0]?.messages ?? []))
}
