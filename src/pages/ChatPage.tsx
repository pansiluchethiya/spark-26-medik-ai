import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Stethoscope, Search, AlertTriangle, Plus, Menu, PanelLeft, Settings } from 'lucide-react'
import { ChatComposer } from '../components/ChatComposer'
import { ChatMessages } from '../components/ChatMessages'
import { ChatHistoryDrawer, ChatHistoryPanel } from '../components/ChatHistoryDrawer'
import { navigate } from '../lib/route'
import { SettingsModal } from '../components/SettingsModal'
import { readAssistantStream } from '../lib/stream'
import { apiHeaders, apiUrl } from '../lib/api'
import { newSession, readChatSessions, saveChatSessions } from '../lib/store/chat'
import { speakText } from '../lib/tts'
import type { ChatMessage, ChatSession, LocalPreferences } from '../types/app'
import { preferencesKey } from '../lib/store/keys'

function readPreferences(): LocalPreferences {
  try {
    const raw = localStorage.getItem(preferencesKey)
    if (!raw) return { theme: 'light' }
    const p = JSON.parse(raw) as LocalPreferences
    return {
      theme: (p.theme as LocalPreferences['theme']) ?? 'light',
      autoReadResponses: Boolean(p.autoReadResponses),
      ttsVoice: p.ttsVoice ?? 'auto',
    }
  } catch { return { theme: 'light' } }
}

export default function ChatPage() {
  const initialSessions = readChatSessions()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.id ?? '')
  const [messages, setMessages] = useState<ChatMessage[]>(initialSessions[0]?.messages ?? [])
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [preferences, setPreferences] = useState<LocalPreferences>(() => readPreferences())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [flyoutOpen, setFlyoutOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preferences.theme ?? 'light')
  }, [preferences.theme])

  const persistMessages = (nextMessages: ChatMessage[]) => {
    setMessages(nextMessages)
    const nextSessions = chatSessions.map((s) => s.id === activeSessionId ? { ...s, messages: nextMessages, title: nextMessages[0]?.content.slice(0, 42) || 'New conversation', updatedAt: new Date().toISOString() } : s)
    setChatSessions(nextSessions)
    saveChatSessions(nextSessions)
  }

  const startNewChat = () => {
    const session = newSession()
    const nextSessions = [session, ...chatSessions]
    setChatSessions(nextSessions)
    setActiveSessionId(session.id)
    setMessages([])
    setPrompt('')
    setError('')
    setEditingIndex(null)
    saveChatSessions(nextSessions)
    setDrawerOpen(false)
  }

  const selectChat = (session: ChatSession) => {
    setActiveSessionId(session.id)
    setMessages(session.messages)
    setPrompt('')
    setError('')
    setEditingIndex(null)
    setDrawerOpen(false)
  }

  const deleteChatSession = (sessionId: string) => {
    const remaining = chatSessions.filter(s => s.id !== sessionId)
    const nextSessions = remaining.length ? remaining : [newSession()]
    setChatSessions(nextSessions)
    saveChatSessions(nextSessions)
    if (sessionId === activeSessionId) {
      setActiveSessionId(nextSessions[0].id)
      setMessages(nextSessions[0].messages)
    }
  }

  const updatePreferences = (next: LocalPreferences) => {
    setPreferences(next)
    localStorage.setItem(preferencesKey, JSON.stringify(next))
    document.documentElement.setAttribute('data-theme', next.theme ?? 'light')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = prompt.trim()
    if (!text) return
    setEditingIndex(null)
    void submitPrompt(text)
  }

  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<ChatMessage[]>(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])
  const stopSending = () => abortRef.current?.abort()

  const submitPrompt = async (rawContent: string, baseMessages: ChatMessage[] = messages) => {
    const content = rawContent.trim()
    if (!content || isSending) return
    const nextMessages = [...baseMessages, { role: 'user' as const, content }]
    const apiMessages = nextMessages.filter((m) => m.content.trim()).map(({ role, content: c }) => ({ role, content: c }))
    persistMessages(nextMessages)
    setPrompt('')
    setError('')
    setIsSending(true)

    try {
      const controller = new AbortController()
      abortRef.current = controller
      const response = await fetch(apiUrl('/api/v1/ai/chat'), {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        signal: controller.signal,
        body: JSON.stringify({ messages: apiMessages, stream: true }),
      })
      if (!response.ok) throw new Error('Triage service unreachable')

      setMessages((cur) => [...cur, { role: 'assistant', content: '' }])
      const answer = await readAssistantStream(
        response,
        (token) => setMessages((cur) => cur.map((m, i) => i === cur.length - 1 && m.role === 'assistant' ? { ...m, content: `${m.content}${token}` } : m)),
        undefined,
        undefined,
        (warning) => setMessages((cur) => cur.map((m, i) => i === cur.length - 1 && m.role === 'assistant' ? { ...m, warning } : m)),
        (sources) => setMessages((cur) => cur.map((m, i) => i === cur.length - 1 && m.role === 'assistant' ? { ...m, sources: [...(m.sources || []), ...sources] } : m)),
        undefined,
        { signal: controller.signal },
      )
      setMessages((cur) => cur.map((m, i) => i === cur.length - 1 && m.role === 'assistant' ? { ...m, content: answer } : m))
      const finalMsg = nextMessages.concat([{ role: 'assistant' as const, content: answer }])
      const finalSessions = chatSessions.map((s) => s.id === activeSessionId ? { ...s, messages: finalMsg, title: finalMsg[0]?.content.slice(0, 42) || 'New conversation', updatedAt: new Date().toISOString() } : s)
      saveChatSessions(finalSessions)
      setChatSessions(finalSessions)
      if (preferences.autoReadResponses) {
        speakText({ rawMarkdown: answer, voice: preferences.ttsVoice ?? 'auto' })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const stopped = messagesRef.current.filter((m) => m.content.trim())
        setChatSessions((prev) => {
          const next = prev.map((s) => s.id === activeSessionId ? { ...s, messages: stopped, title: s.title === 'New conversation' ? stopped[0]?.content.slice(0, 42) || 'New conversation' : s.title, updatedAt: new Date().toISOString() } : s)
          saveChatSessions(next)
          return next
        })
        setMessages(stopped)
        return
      }
      const msg = error instanceof Error ? error.message : 'The triage assistant could not complete this request.'
      setMessages((cur) => cur.filter((m, i) => !(i === cur.length - 1 && m.role === 'assistant' && !m.content.trim())))
      setError(`${msg} Please try again.`)
    } finally { abortRef.current = null; setIsSending(false) }
  }

  const regenerateLast = () => {
    if (isSending || messages.length === 0) return
    const lastAssistant = [...messages].map((m, i) => ({ m, i })).reverse().find(({ m }) => m.role === 'assistant')
    if (!lastAssistant) return
    const userIdx = [...messages].slice(0, lastAssistant.i).map((m, i) => ({ m, i })).reverse().find(({ m }) => m.role === 'user')?.i
    if (userIdx === undefined) return
    const truncated = messages.slice(0, userIdx + 1)
    persistMessages(truncated)
    setError('')
    void submitPrompt(truncated[userIdx].content, truncated)
  }

  const editUserMessage = (index: number) => {
    if (isSending) return
    const target = messages[index]
    if (!target || target.role !== 'user') return
    setEditingIndex(index)
    persistMessages(messages.slice(0, index))
    setPrompt(target.content)
    setError('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setPrompt('')
  }

  return (
    <main className="flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden bg-canvas text-ink lg:flex-row dark:bg-[#121c19] dark:text-[#e8f0ee] supports-[height:100dvh]:h-[100dvh]">
      {/* Desktop icon rail (replaces the top bar on lg+) */}
      <nav aria-label="App navigation" className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-line bg-card py-4 lg:flex dark:border-[#2c4039] dark:bg-[#192622]">
        <button type="button" onClick={() => navigate('/')} title="Back to home" aria-label="Back to home" className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white transition hover:bg-accent-hover dark:bg-[#257d6e] dark:text-white">
          <Stethoscope size={19} />
        </button>
        <button type="button" onClick={startNewChat} title="New chat" aria-label="New chat" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-card-subtle text-muted transition hover:border-accent hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:text-[#9eb5ae] dark:hover:text-white">
          <Plus size={18} />
        </button>
        <button type="button" onClick={() => setFlyoutOpen((v) => !v)} title="Chat history" aria-label="Chat history" aria-pressed={flyoutOpen} className={`grid h-10 w-10 place-items-center rounded-xl border transition ${flyoutOpen ? 'border-accent bg-accent-soft text-accent dark:border-[#296659] dark:bg-[#21302b] dark:text-white' : 'border-line bg-card-subtle text-muted hover:border-accent hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:text-[#9eb5ae] dark:hover:text-white'}`}>
          <PanelLeft size={18} />
        </button>
        <div className="mt-auto flex flex-col items-center gap-2">
          <button type="button" onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-card-subtle text-muted transition hover:border-accent hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:text-[#9eb5ae] dark:hover:text-white">
            <Settings size={17} />
          </button>
        </div>
      </nav>

      {/* Desktop history flyout */}
      {flyoutOpen && (
        <aside className="hidden h-full w-[320px] shrink-0 flex-col border-r border-line bg-card animate-drawer lg:flex dark:border-[#2c4039] dark:bg-[#192622]">
          <ChatHistoryPanel sessions={chatSessions} activeId={activeSessionId} onSelect={selectChat} onDelete={deleteChatSession} onNew={startNewChat} onClose={() => setFlyoutOpen(false)} />
        </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Top bar - floating glass pill on mobile, hidden on desktop (rail) */}
      <header className="mx-3 mt-[calc(0.75rem+env(safe-area-inset-top))] flex h-14 w-auto shrink-0 items-center justify-between gap-2 rounded-3xl border border-line bg-card px-2.5 shadow-lg sm:mx-4 sm:h-[64px] sm:gap-3 sm:px-4 lg:hidden dark:border-[#2c4039] dark:bg-[#192622]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Open navigation" onClick={() => setDrawerOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-card-subtle text-muted hover:bg-accent-soft hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:text-[#9eb5ae]">
            <Menu size={18} />
          </button>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white dark:bg-[#257d6e] dark:text-white" aria-hidden="true"><Stethoscope size={18} /></span>
          <div className="hidden sm:block">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent dark:text-accent-bright">Medik</p>
            <p className="text-[14px] font-extrabold leading-none -mt-0.5">Triage</p>
          </div>
          <span className="hidden lg:inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-accent dark:bg-[#21302b] dark:text-accent-bright">AI diagnostic</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-card-subtle text-muted hover:bg-accent-soft hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b]">
            <Settings size={16} />
          </button>
          <button type="button" onClick={startNewChat} className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-[13px] font-bold text-white shadow-sm hover:bg-accent-hover dark:bg-[#257d6e] dark:text-white">New chat</button>
        </div>
      </header>

      {/* Workspace - centered, constrained, proper vertical rhythm, mobile-first */}
      <section aria-label="Main workspace" className="relative flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden">
        <div className="flex h-full w-full max-w-[720px] min-h-0 flex-1 flex-col px-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pt-3">
          {messages.length === 0 ? (
            <div className="flex w-full flex-1 flex-col items-center justify-center py-4 text-center sm:py-6">
              <span className="grid h-11 w-11 place-items-center rounded-full border-[2.5px] border-accent bg-card text-accent shadow-sm sm:h-[52px] sm:w-[52px] dark:border-accent-bright dark:text-accent-bright" aria-hidden="true"><Plus size={20} strokeWidth={2.75} className="sm:h-6 sm:w-6" /></span>
              <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-accent dark:text-accent-bright sm:mt-4 sm:text-[11px]">AI triage & diagnostic</p>
              <h1 className="mt-1 max-w-[560px] text-[22px] font-extrabold tracking-tight sm:text-[30px]">Tell me what’s going on.</h1>
              <p className="mt-2 max-w-[520px] px-1 text-[13px] leading-relaxed text-muted dark:text-[#9eb5ae] sm:px-0 sm:text-[13.5px]">Describe your symptoms in your own words. The assistant uses current medical information (web search) to explain possibilities, red flags, and next steps — not a medical diagnosis.</p>

              <div aria-label="Suggested prompts" className="mt-5 grid w-full max-w-[640px] grid-cols-1 gap-2 sm:gap-2.5 xs:grid-cols-2 sm:grid-cols-3">
                {[
                  { icon: Stethoscope, title: 'Fever + sore throat', hint: '2 days, what could it be?', q: 'I have had a fever and sore throat for 2 days, with headache and mild cough. What could this be and when should I seek care?' },
                  { icon: Search, title: 'Stomach pain', hint: 'Cramps after meals', q: 'I have cramping stomach pain after meals for a week, with bloating and occasional nausea. What are likely causes and red flags?' },
                  { icon: AlertTriangle, title: 'Chest tightness', hint: 'When is it urgent?', q: 'I feel occasional chest tightness and shortness of breath on exertion. What should I watch for and when is it an emergency?' },
                ].map((s, sIdx) => (
                  <button key={s.title} type="button" onClick={() => setPrompt(s.q)} style={{ animationDelay: `${sIdx * 90}ms` }} className="animate-pop flex min-h-[84px] flex-col items-start gap-1 rounded-2xl border border-line bg-card p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft hover:shadow-md dark:border-[#2c4039] dark:bg-[#192622] dark:hover:border-accent-bright">
                    <span className="flex items-center gap-2 text-[13px] font-bold text-ink dark:text-[#e8f0ee]"><s.icon size={15} className="shrink-0 text-accent dark:text-accent-bright" />{s.title}</span>
                    <span className="text-[12px] text-muted dark:text-[#9eb5ae]">{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ChatMessages
              messages={messages}
              isSending={isSending}
              ttsVoice={preferences.ttsVoice ?? 'auto'}
              onEditMessage={editUserMessage}
              onRegenerate={regenerateLast}
              onSelectFollowUp={(text) => void submitPrompt(text)}
            />
          )}

          {/* Composer - centered, constrained */}
          <div className="mx-auto w-full max-w-[720px] shrink-0 pt-2">
            <ChatComposer prompt={prompt} isSending={isSending} isEditing={editingIndex !== null} onChange={setPrompt} onSubmit={handleSubmit} onStop={stopSending} onCancelEdit={cancelEdit} />
            {error && <p role="alert" className="mt-2 rounded-xl border border-urgent-border bg-urgent-bg px-3 py-2 text-[13px] font-semibold text-urgent-strong dark:bg-[#dc2626]/10">{error}</p>}
          </div>
        </div>
      </section>

      <footer className="mx-auto hidden w-full max-w-[720px] shrink-0 px-4 pb-4 pt-1 text-center text-[11px] font-medium text-faint sm:block dark:text-[#6e857e]">Medik Triage is AI information only — not a medical diagnosis. Verify important information with a clinician.</footer>
      </div>{/* /content column */}

      {drawerOpen && (
        <ChatHistoryDrawer
          sessions={chatSessions}
          activeId={activeSessionId}
          onClose={() => setDrawerOpen(false)}
          onSelect={selectChat}
          onDelete={deleteChatSession}
          onNew={startNewChat}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          preferences={preferences}
          onPreferencesChange={updatePreferences}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  )
}
