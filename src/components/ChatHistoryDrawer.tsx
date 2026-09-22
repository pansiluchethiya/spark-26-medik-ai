import type { ChatSession } from '../types/app'
import { ChatSidebar } from './ChatSidebar'

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
    <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={onSelect}
        onDelete={onDelete}
        onNew={onNew}
        onClose={onClose}
        className="animate-drawer relative w-[340px] max-w-[88vw] border-r border-line shadow-xl dark:border-[#2c4039]"
      />
    </div>
  )
}
