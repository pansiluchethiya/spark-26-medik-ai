import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types/app'
import { MarkdownResponse } from './MarkdownResponse'
import { ExternalLink, Globe, Pencil, Volume2, Square, FastForward, Plus, Copy, Check, Sparkles } from 'lucide-react'
import { FollowUpBar, MatchMeter, TrustFooter } from './chat/messageExtras'
import { extractMatches } from '../lib/matches'
import { cn } from '../lib/cn'
import { speakText, stopSpeech } from '../lib/tts'
import type { TtsVoiceId } from '../lib/tts'

function extractSourcesFromMarkdown(content: string) {
  const matches = [...content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
  const m = new Map<string, { title: string; url: string; host: string }>()
  for (const [, title, url] of matches) {
    try { const host = new URL(url).hostname.replace(/^www\./, ''); if (!m.has(url)) m.set(url, { title: title.trim(), url: host ? url : '', host }) } catch { /* ignore */ }
  }
  return Array.from(m.values()).filter(v => v.url)
}

function deriveFollowUps(message: ChatMessage): string[] {
  const chips: string[] = []
  if (message.warning) chips.push('What warning signs need emergency care?')
  if ((message.sources?.length ?? 0) > 0) chips.push('Explain this in simpler terms')
  chips.push('What should I do next?')
  chips.push('What info would help narrow this down?')
  return Array.from(new Set(chips)).slice(0, 3)
}

export function ChatMessages({
  messages, isSending, ttsVoice = 'auto', onEditMessage, onRegenerate, onSelectFollowUp,
}: {
  messages: ChatMessage[]
  isSending: boolean
  ttsVoice?: TtsVoiceId
  onEditMessage?: (index: number) => void
  onRegenerate?: () => void
  onSelectFollowUp?: (text: string) => void
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0)
  const conversationRef = useRef<HTMLDivElement>(null)

  useEffect(() => { conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, isSending])
  useEffect(() => () => { stopSpeech() }, [])

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000)
  }
  const handleToggleSpeech = (content: string, index: number) => {
    if (speakingIndex === index) { stopSpeech(); setSpeakingIndex(null) }
    else speakText({
      rawMarkdown: content, voice: ttsVoice, rate: playbackRate,
      onStart: () => setSpeakingIndex(index),
      onEnd: () => setSpeakingIndex(null),
      onError: () => setSpeakingIndex(null),
    })
  }
  const cycleRate = () => setPlaybackRate(r => r === 1.0 ? 1.25 : r === 1.25 ? 1.5 : 1.0)

  const actionBtn = 'inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line bg-card px-2.5 text-[11px] font-semibold text-muted transition hover:border-accent-border hover:bg-accent-soft hover:text-accent dark:border-[#22332c] dark:bg-[#21302b] dark:text-[#9eb5ae] dark:hover:text-accent-bright'

  return (
    <div ref={conversationRef} aria-live="polite" className="mx-auto mb-3 flex min-h-0 w-full max-w-[720px] min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-clip px-1 py-2 sm:px-1.5">
      {messages.map((message, index) => {
        const sources = message.role === 'assistant' ? extractSourcesFromMarkdown(message.content) : []
        const isUser = message.role === 'user'
        const isLastAssistant = message.role === 'assistant' && messages.slice(index + 1).every(m => m.role !== 'assistant')
        const followUps = isLastAssistant && !isSending && onSelectFollowUp ? deriveFollowUps(message) : []
        const sourceCount = message.sources?.length ?? sources.length
        const isSpeaking = speakingIndex === index

        return (
          <article
            key={`${message.role}-${index}`}
            className={cn(
              'animate-rise min-w-0 max-w-full rounded-2xl border text-[15px] leading-relaxed shadow-md backdrop-blur-xl saturate-150 sm:p-[18px_22px] p-4',
              isUser
                ? 'ml-auto w-fit max-w-[92%] rounded-br-md border-accent-border/60 bg-accent-soft/70 text-ink sm:max-w-[85%] dark:border-[#296659]/60 dark:bg-[#21302b]/70 dark:text-[#e8f0ee]'
                : 'w-full rounded-bl-md border-line/80 bg-card/80 text-ink dark:border-[#2c4039]/80 dark:bg-[#192622]/80 dark:text-[#e8f0ee]',
            )}
          >
            {message.role === 'assistant' && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-2.5 dark:border-[#22332c]">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-accent dark:text-accent-bright">
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-accent text-white dark:bg-[#257d6e] dark:text-white" aria-hidden="true"><Plus size={13} strokeWidth={3.5} /></span>
                  Medik Triage
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => handleToggleSpeech(message.content, index)} title={isSpeaking ? 'Stop' : 'Listen'} className={cn(actionBtn, isSpeaking && 'border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626] hover:text-white hover:bg-[#dc2626]')}>
                    {isSpeaking ? <><Square size={12} /><span>Stop</span></> : <><Volume2 size={12} /><span>Listen</span></>}
                  </button>
                  <button type="button" onClick={cycleRate} title="Playback speed" className={actionBtn}><FastForward size={12} /><span>{playbackRate}x</span></button>
                  <button type="button" onClick={() => handleCopy(message.content, index)} title="Copy" className={actionBtn}>
                    {copiedIndex === index ? <><Check size={12} /><span>Copied</span></> : <><Copy size={12} /><span>Copy</span></>}
                  </button>
                </div>
              </div>
            )}

            {message.role === 'assistant' && message.warning && (
              <div className="my-2 flex items-center gap-2 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-3 text-xs text-[#92400e] dark:text-[#fcd34d]" role="alert"><span aria-hidden="true">⚠️</span><span>{message.warning}</span></div>
            )}

            {message.role === 'assistant' ? <MarkdownResponse content={message.content} /> : (
              <div>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                {onEditMessage && !isSending && (
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={() => onEditMessage(index)} className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line bg-white px-3 text-[11px] font-semibold text-faint shadow-sm transition hover:border-accent hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:text-[#9eb5ae] dark:hover:text-accent-bright">
                      <Pencil size={12} /><span>Edit & resend</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {message.role === 'assistant' && (message.sources?.length || sources.length > 0) && (
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-line bg-card-subtle p-3 dark:border-[#22332c] dark:bg-[#21302b]/50">
                <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-accent dark:text-accent-bright"><Globe size={13} /> Verified sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {(message.sources?.length ? message.sources : sources.map(s => ({ id: s.url, title: s.title, url: s.url, domain: s.host, quality: 'Verified' as const }))).map((src, sIdx) => (
                    <a key={`${src.url}-${sIdx}`} href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:-translate-y-px hover:border-accent hover:text-accent dark:border-[#22332c] dark:bg-[#192622] dark:text-[#e8f0ee] dark:hover:text-accent-bright">
                      <span className="truncate">{src.title || src.domain}</span>
                      <span className="shrink-0 font-normal text-faint">({src.domain})</span>
                      <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <TrustFooter message={message} sourceCount={sourceCount} />
            {message.role === 'assistant' && message.content.trim() && (
              <MatchMeter matches={extractMatches(message.content)} />
            )}
            {isLastAssistant && !isSending && (
              <FollowUpBar followUps={followUps} actionClass={actionBtn} onRegenerate={onRegenerate} onSelectFollowUp={(text) => onSelectFollowUp?.(text)} />
            )}
            {isLastAssistant && !isSending && (
              <p className="mt-2 flex items-center gap-1 text-[10px] text-faint dark:text-[#6e857e]"><Sparkles size={10} /> AI information only — not a medical diagnosis</p>
            )}
          </article>
        )
      })}

      {isSending && (
        <div className="flex px-1 py-1" aria-live="polite">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-xs font-medium text-muted shadow-sm dark:border-[#2c4039] dark:bg-[#21302b] dark:text-[#9eb5ae]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent dark:bg-accent-bright" />
            Thinking…
          </p>
        </div>
      )}
    </div>
  )
}
