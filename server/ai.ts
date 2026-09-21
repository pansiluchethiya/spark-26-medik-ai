import { buildSystemPrompt } from './tools/prompt.ts'
import { streamAssistant } from './ai/stream.ts'

export function buildChatSystemPrompt() {
  return buildSystemPrompt()
}

export { streamAssistant }
