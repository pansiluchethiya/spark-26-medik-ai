export type AgentStep = {
  id: string
  type: 'search' | 'tool' | 'reasoning'
  title: string
  detail?: string
  status: 'running' | 'completed' | 'failed'
  timestamp: string
}

export type AgentToolEvent = {
  id: string
  name: string
  arguments?: string
  result?: unknown
  status: 'running' | 'completed' | 'failed'
}

export type VerifiedSource = {
  id: string
  title: string
  url: string
  domain: string
  date?: string
  type: 'peer-reviewed' | 'official' | 'guideline' | 'directory'
  quality: 'High' | 'Verified' | 'Secondary'
  excerpt?: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  agentSteps?: AgentStep[]
  sources?: VerifiedSource[]
  activeRoles?: string[]
  isDegraded?: boolean
  warning?: string
}

export type ChatSession = {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
}

export type LocalPreferences = {
  theme?: 'light' | 'dark'
  autoReadResponses?: boolean
  ttsVoice?: string
}
