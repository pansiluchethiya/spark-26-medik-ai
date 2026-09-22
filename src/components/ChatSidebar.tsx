import { useMemo, useState } from 'react'
import { Clock3, MessageSquare, Plus, Search, Stethoscope, Trash2, X } from 'lucide-react'
import type { ChatSession } from '../types/app'
import { cn } from '../lib/cn'

// Shared sidebar body: static on desktop, inside the slide-over on mobile.
export function ChatSidebar({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onNew,
  onClose,
  className,
}: {
  sessions: ChatSession[]
  activeId: string
  onSelect: (s: ChatSession) => void
  onDelete: (id: string) => void
  onNew: () => void
  onClose?: () => void
  className?: string
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
    <aside className={cn('flex h-full w-full flex-col bg-card dark:bg-[#192622]', className)}>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5 dark:border-[#22332c]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white dark:bg-[#257d6e]" aria-hidden="true"><Stethoscope size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent dark:text-accent-bright">Medik</p>
          <p className="-mt-0.5 text-[14px] font-extrabold leading-none">Triage</p>
        </div>
        {onClose && (
          <button type="button" aria-label="Close history" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-card-subtle text-muted dark:border-[#2c4039] dark:bg-[#21302b]"><X size={14} /></button>
        )}
      </div>

      <div className="p-3">
        <button type="button" onClick={onNew} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2.5 text-sm font-bold text-white transition hover:bg-accent-hover active:translate-y-px dark:bg-[#257d6e] dark:hover:bg-[#2f9483]"><Plus size={15} strokeWidth={3} /> New chat</button>
        <label className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-card-subtle px-3 py-2 text-sm dark:border-[#2c4039] dark:bg-[#21302b]">
          <Search size={14} className="shrink-0 text-faint" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent text-ink outline-none placeholder:text-faint dark:text-[#e8f0ee]" />
        </label>
        <p className="mt-2 flex items-center justify-between text-[11px] text-faint"><span className="flex items-center gap-1"><MessageSquare size={12} /> {sessions.length} total</span><span className="flex items-center gap-1"><Clock3 size={12} /> On this device</span></p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {filtered.length ? filtered.map(s => (
          <div key={s.id} className={`group mb-2 flex items-stretch overflow-hidden rounded-xl border transition ${s.id===activeId ? 'border-accent bg-accent-soft dark:border-[#296659] dark:bg-[#21302b]' : 'border-line bg-card-subtle/50 hover:border-accent-border dark:border-[#2c4039] dark:bg-[#1e2e2a] dark:hover:border-[#296659]'}`}>
            <button type="button" onClick={() => onSelect(s)} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2.5 text-left">
              <span className="w-full truncate text-[13px] font-bold text-ink dark:text-[#e8f0ee]">{s.title}</span>
              <span className="w-full truncate text-[11px] text-muted dark:text-[#9eb5ae]">{s.messages.find(m => m.role==='user')?.content || 'Start a new conversation'}</span>
              <span className="text-[10px] text-faint">{s.messages.length ? `${s.messages.length} msgs` : 'Empty'} · {formatDate(s.updatedAt)}</span>
            </button>
            <button type="button" aria-label={`Delete ${s.title}`} title="Delete" onClick={() => onDelete(s.id)} className="grid w-10 shrink-0 place-items-center border-l border-line text-faint transition hover:bg-urgent-bg hover:text-urgent-strong dark:border-[#2c4039]">
              <Trash2 size={14} />
            </button>
          </div>
        )) : <p className="py-8 text-center text-sm text-faint">No conversations match.</p>}
      </div>
      <p className="border-t border-line-soft px-3 py-2 text-center text-[11px] text-faint dark:border-[#22332c]">Stored locally — no database.</p>
    </aside>
  )
}
