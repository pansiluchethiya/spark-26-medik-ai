import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types/app'
import { MarkdownResponse, hasHealthUI } from './MarkdownResponse'
import { AlertTriangle, Download, ExternalLink, Globe, Pencil, Volume2, Square, FastForward, Plus, Copy, Check, Sparkles } from 'lucide-react'
import { FollowUpBar, MatchMeter, QuickReplies, TrustFooter } from './chat/messageExtras'
import { extractQuickReplies, stripQuickReplies } from '../lib/quickreplies'
import { extractMatches } from '../lib/matches'
import { normalizeSections, splitNormalized } from '../lib/sections'
import { GlassBubble } from './GlassBubble'
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

// Floating chips pinned to an assistant answer, driven by THAT answer's
// real data (top match, red-flag section, verified source count).
// Decorative duplicates of in-card content → hidden from screen readers.
function AnswerFloaters({ message }: { message: ChatMessage }) {
  const matches = extractMatches(message.content)
  const top = matches[0]
  const kinds = new Set(splitNormalized(normalizeSections(message.content)).map((b) => b.kind))
  const sourceCount = message.sources?.length ?? 0
  if (!top && !kinds.has('urgent') && sourceCount === 0) return null
  return (
    <>
      {top && (
        <div className="pointer-events-none absolute -left-3 top-12 hidden w-44 -translate-x-full xl:block" aria-hidden="true">
          <div className="animate-float rounded-2xl border border-line/70 bg-card/70 p-3 text-left shadow-md backdrop-blur-xl dark:border-[#2c4039]/70 dark:bg-[#192622]/70">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-accent dark:text-accent-bright">Top match</p>
            <p className="mt-0.5 truncate text-[12px] font-bold">{top.label}</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-soft dark:bg-[#0f1a17]">
              <div className="h-full rounded-full bg-accent dark:bg-accent-bright" style={{ width: `${top.score}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-extrabold tabular-nums text-accent dark:text-accent-bright">{top.score}%</p>
          </div>
        </div>
      )}
      {(kinds.has('urgent') || sourceCount > 0) && (
        <div className="pointer-events-none absolute -right-3 top-16 hidden w-44 translate-x-full xl:block" aria-hidden="true">
          <div className="animate-float-slow rounded-2xl border border-line/70 bg-card/70 p-3 text-left shadow-md backdrop-blur-xl dark:border-[#2c4039]/70 dark:bg-[#192622]/70">
            {kinds.has('urgent') && (
              <p className="flex items-center gap-1.5 text-[12px] font-bold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#dc2626]/10 text-[#dc2626]"><AlertTriangle size={13} /></span>Red flags checked</p>
            )}
            {sourceCount > 0 && (
              <p className={cn('flex items-center gap-1.5 text-[12px] font-bold', kinds.has('urgent') && 'mt-1.5')}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent dark:bg-[#21302b] dark:text-accent-bright"><Globe size={13} /></span>{sourceCount} verified {sourceCount === 1 ? 'source' : 'sources'}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
export function ChatMessages({
  messages, isSending, ttsVoice = 'auto', onEditMessage, onRegenerate, onSelectFollowUp, onPrefill,
}: {
  messages: ChatMessage[]
  isSending: boolean
  ttsVoice?: TtsVoiceId
  onEditMessage?: (index: number) => void
  onRegenerate?: () => void
  onSelectFollowUp?: (text: string) => void
  onPrefill?: (text: string) => void
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0)
  const conversationRef = useRef<HTMLDivElement>(null)
  // Stick-to-bottom: follow new tokens only while the user is already at
  // the bottom. If they scroll up to read, stay put and offer a jump button.
  const stickRef = useRef(true)
  const [stuck, setStuck] = useState(true)

  const handleScroll = () => {
    const el = conversationRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    stickRef.current = nearBottom
    setStuck(nearBottom)
  }

  const jumpToLatest = () => {
    const el = conversationRef.current
    if (!el) return
    stickRef.current = true
    setStuck(true)
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = conversationRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [messages, isSending])
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

  const handleDownload = (content: string, index: number) => {
    const blob = new Blob([stripQuickReplies(content)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medik-answer-${index + 1}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const actionBtn = 'inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line bg-card px-2.5 text-[11px] font-semibold text-muted transition hover:border-accent-border hover:bg-accent-soft hover:text-accent dark:border-[#22332c] dark:bg-[#21302b] dark:text-[#9eb5ae] dark:hover:text-accent-bright'

  return (
    <div ref={conversationRef} onScroll={handleScroll} aria-live="polite" className="mx-auto mb-3 flex min-h-0 w-full max-w-[720px] min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-clip px-1 py-2 sm:px-1.5">
      {messages.map((message, index) => {
        const rawContent = message.content
        // Quick-reply markers drive chips — never shown as text, copied, or read aloud.
        const content = message.role === 'assistant' ? stripQuickReplies(rawContent) : rawContent
        const quickReplies = message.role === 'assistant' ? extractQuickReplies(rawContent) : []
        const sources = message.role === 'assistant' ? extractSourcesFromMarkdown(content) : []
        const isUser = message.role === 'user'
        const isLastAssistant = message.role === 'assistant' && messages.slice(index + 1).every(m => m.role !== 'assistant')
        const followUps = isLastAssistant && !isSending && onSelectFollowUp ? deriveFollowUps(message) : []
        const sourceCount = message.sources?.length ?? sources.length
        const isSpeaking = speakingIndex === index
        // Older bubbles in long chats render without the SVG filter
        // to keep scrolling smooth; newest 25 keep full liquid glass.
        const glassDisabled = index < messages.length - 25

        return (
          <GlassBubble
            key={`${message.role}-${index}`}
            kind={isUser ? 'user' : 'assistant'}
            disabled={glassDisabled}
            className={cn(
              'animate-rise relative text-[15px] leading-relaxed',
              isUser
                ? 'ml-auto w-fit max-w-[92%] rounded-br-md border-clay-border sm:max-w-[85%]'
                : 'w-full rounded-bl-md border-line dark:border-[#2c4039]',
            )}
          >
            {message.role === 'assistant' && content.trim() && <AnswerFloaters message={{ ...message, content }} />}
            {message.role === 'assistant' && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-2.5 dark:border-[#22332c]">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-accent dark:text-accent-bright">
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-accent text-white dark:bg-[#257d6e] dark:text-white" aria-hidden="true"><Plus size={13} strokeWidth={3.5} /></span>
                  Medik Triage
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => handleToggleSpeech(content, index)} title={isSpeaking ? 'Stop' : 'Listen'} className={cn(actionBtn, isSpeaking && 'border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626] hover:text-white hover:bg-[#dc2626]')}>
                    {isSpeaking ? <><Square size={12} /><span>Stop</span></> : <><Volume2 size={12} /><span>Listen</span></>}
                  </button>
                  <button type="button" onClick={cycleRate} title="Playback speed" className={actionBtn}><FastForward size={12} /><span>{playbackRate}x</span></button>
                  <button type="button" onClick={() => handleCopy(content, index)} title="Copy" className={actionBtn}>
                    {copiedIndex === index ? <><Check size={12} /><span>Copied</span></> : <><Copy size={12} /><span>Copy</span></>}
                  </button>
                  <button type="button" onClick={() => handleDownload(content, index)} title="Download answer" className={actionBtn}>
                    <Download size={12} /><span>Save</span>
                  </button>
                </div>
              </div>
            )}

            {message.role === 'assistant' && message.warning && (
              <div className="my-2 flex items-center gap-2 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-3 text-xs text-[#92400e] dark:text-[#fcd34d]" role="alert"><span aria-hidden="true">⚠️</span><span>{message.warning}</span></div>
            )}

            {message.role === 'assistant' ? <MarkdownResponse content={content} /> : (
              <div>
                <p className="whitespace-pre-wrap break-words">{content}</p>
                {onEditMessage && (
                  <div className="mt-2 flex min-h-[32px] justify-end">
                    {isSending ? (
                      <span aria-hidden="true" className="invisible inline-flex min-h-[32px] items-center px-3 text-[11px] font-semibold">Edit &amp; resend</span>
                    ) : (
                      <button type="button" onClick={() => onEditMessage(index)} className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line bg-white px-3 text-[11px] font-semibold text-faint shadow-sm transition hover:border-accent hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:text-[#9eb5ae] dark:hover:text-accent-bright">
                        <Pencil size={12} /><span>Edit & resend</span>
                      </button>
                    )}
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
            {message.role === 'assistant' && content.trim() && (
              <MatchMeter
                matches={extractMatches(content)}
                onSelectMatch={onSelectFollowUp && !isSending
                  ? (label) => onSelectFollowUp(`Tell me more about "${label}": what causes it, its key symptoms, and when I should worry.`)
                  : undefined}
              />
            )}
            {isLastAssistant && !isSending && onPrefill && quickReplies.length > 0 && (
              <QuickReplies replies={quickReplies} onPrefill={onPrefill} />
            )}
            {/* Health-only extras: casual replies stay a plain bubble. */}
            {isLastAssistant && !isSending && hasHealthUI(message.content) && (
              <FollowUpBar followUps={followUps} actionClass={actionBtn} onRegenerate={onRegenerate} onSelectFollowUp={(text) => onSelectFollowUp?.(text)} />
            )}
            {isLastAssistant && !isSending && hasHealthUI(message.content) && (
              <p className="mt-2 flex items-center gap-1 text-[10px] text-faint dark:text-[#6e857e]"><Sparkles size={10} /> AI information only — not a medical diagnosis</p>
            )}
          </GlassBubble>
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

      {!stuck && (
        <div className="sticky bottom-3 z-10 -mb-9 flex h-9 justify-center overflow-visible pointer-events-none">
          <button
            type="button"
            onClick={jumpToLatest}
            className="animate-pop pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-[12px] font-bold text-accent shadow-md transition hover:border-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:text-accent-bright"
          >
            ↓ Latest
          </button>
        </div>
      )}
    </div>
  )
}
