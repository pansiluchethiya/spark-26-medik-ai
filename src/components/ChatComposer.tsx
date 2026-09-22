import { useEffect, useRef } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowUp, Square, Pencil } from 'lucide-react'
import { VoiceInput } from './VoiceInput'

export function ChatComposer({
  prompt,
  isSending,
  isEditing,
  onChange,
  onSubmit,
  onStop,
  onCancelEdit,
}: {
  prompt: string
  isSending: boolean
  isEditing?: boolean
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onStop: () => void
  onCancelEdit?: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [prompt])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
    if (event.key === 'Escape' && isEditing) {
      onCancelEdit?.()
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-[20px] border border-line bg-card p-3 shadow-[0_8px_32px_rgba(34,48,44,0.08)] transition focus-within:border-accent/50 focus-within:shadow-[0_8px_32px_rgba(29,92,82,0.12)] dark:border-[#2c4039] dark:bg-[#192622]"
    >
      {isEditing && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <span className="flex items-center gap-1.5"><Pencil size={12} /> Editing message — will resend from here</span>
          <button type="button" onClick={onCancelEdit} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-bold hover:bg-amber-100 dark:border-amber-800 dark:bg-[#2a2416]">Cancel</button>
        </div>
      )}
      <label htmlFor="chat-prompt" className="sr-only">Describe your symptoms</label>
      <textarea
        id="chat-prompt"
        ref={textareaRef}
        value={prompt}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what is wrong — e.g. ‘fever 2 days, sore throat, headache’..."
        aria-label="Describe your symptoms"
        rows={2}
        className="block max-h-[180px] min-h-[56px] w-full resize-none bg-transparent px-1 text-[16px] leading-relaxed text-ink outline-none placeholder:text-faint/80 dark:text-[#e8f0ee] sm:text-[15px]"
      />
      <div className="mt-2 flex items-center gap-2">
        <VoiceInput disabled={isSending} onTranscript={(t) => onChange(`${prompt}${prompt ? ' ' : ''}${t}`)} />
        <span className="hidden text-[11px] font-medium text-faint sm:inline dark:text-[#6e857e]">
          Enter to send · Shift+Enter for new line {isEditing ? '· Esc to cancel edit' : ''}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {isSending ? (
            <button
              className="inline-flex h-9 min-w-[72px] items-center justify-center gap-1.5 rounded-full bg-[#dc2626] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#b91c1c] active:translate-y-px"
              type="button" onClick={onStop} aria-label="Stop generating"
            >
              <Square size={13} /> Stop
            </button>
          ) : (
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:bg-accent-hover active:translate-y-px disabled:opacity-30 dark:bg-[#257d6e] dark:text-white"
              type="submit" aria-label="Send prompt" disabled={!prompt.trim()}
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
