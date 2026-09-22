import { useMemo, useState } from 'react'
import { Clock3, MessageSquare, Search, Trash2, X } from 'lucide-react'
import type { ChatSession } from '../types/app'

export function ChatHistoryDrawer({
  sessions,
  activeId,
  onClose,
  onSelect,
  onDelete,
  onNew,
}: {
  sessions: ChatSession[]
  activeId: string
  onClose: () => void
  onSelect: (s: ChatSession) => void
  onDelete: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-[340px] max-w-[88vw] flex-col border-r border-line bg-card shadow-xl animate-drawer dark:border-[#2c4039] dark:bg-[#192622]">
        <ChatHistoryPanel sessions={sessions} activeId={activeId} onSelect={(s) => { onSelect(s); onClose() }} onDelete={onDelete} onNew={() => { onNew(); onClose() }} onClose={onClose} />
      </aside>
    </div>
  )
}

// Reusable history panel (mobile overlay drawer + desktop flyout sidebar).
export function ChatHistoryPanel({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onNew,
  onClose,
}: {
  sessions: ChatSession[]
  activeId: string
  onSelect: (s: ChatSession) => void
  onDelete: (id: string) => void
  onNew: () => void
  onClose?: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return sessions
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter(s => !q || `${s.title} ${s.messages.map(m => m.content).join(' ')}`.toLowerCase().includes(q))
  }, [sessions, search])

  const formatDate = (v: string) => {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-3.5 dark:border-[#22332c]">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent dark:text-accent-bright">Your conversations</p>
          <h2 className="text-[15px] font-extrabold">History</h2>
        </div>
        {onClose && (
          <button type="button" aria-label="Close history" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-card-subtle dark:border-[#2c4039] dark:bg-[#21302b]"><X size={14} /></button>
        )}
      </div>

        <div className="p-3">
          <button type="button" onClick={onNew} className="w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-bold text-white hover:bg-accent-hover dark:bg-[#257d6e] dark:text-white">+ New conversation</button>
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-card-subtle px-3 py-2 text-sm dark:border-[#2c4039] dark:bg-[#21302b]">
            <Search size={14} className="text-faint" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent outline-none placeholder:text-faint" />
          </label>
          <p className="mt-2 flex items-center justify-between text-[11px] text-faint"><span className="flex items-center gap-1"><MessageSquare size={12} /> {sessions.length} total</span><span className="flex items-center gap-1"><Clock3 size={12} /> On this device</span></p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {filtered.length ? filtered.map(s => (
            <div key={s.id} className={`group mb-2 flex items-stretch overflow-hidden rounded-xl border ${s.id===activeId ? 'border-accent bg-accent-soft dark:border-accent-bright dark:bg-[#21302b]' : 'border-line bg-card dark:border-[#2c4039] dark:bg-[#1e2e2a]'}`}>
              <button type="button" onClick={() => onSelect(s)} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2.5 text-left">
                <span className="w-full truncate text-[13px] font-bold">{s.title}</span>
                <span className="w-full truncate text-[11px] text-muted dark:text-[#9eb5ae]">{s.messages.find(m => m.role==='user')?.content || 'Start a new conversation'}</span>
                <span className="text-[10px] text-faint">{s.messages.length ? `${s.messages.length} msgs` : 'Empty'} · {formatDate(s.updatedAt)}</span>
              </button>
              <button type="button" aria-label={`Delete ${s.title}`} title="Delete" onClick={() => onDelete(s.id)} className="grid w-10 place-items-center border-l border-line text-faint hover:bg-urgent-bg hover:text-urgent-strong dark:border-[#2c4039]">
                <Trash2 size={14} />
              </button>
            </div>
          )) : <p className="py-8 text-center text-sm text-faint">No conversations match.</p>}
        </div>
        <p className="border-t border-line-soft px-3 py-2 text-center text-[11px] text-faint dark:border-[#22332c]">Stored locally — no database.</p>
    </div>
  )
}
