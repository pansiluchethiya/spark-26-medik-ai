import { Activity, RotateCcw, ShieldCheck } from 'lucide-react'
import type { ChatMessage } from '../../types/app'
import type { MatchCandidate } from '../../lib/matches'

export type TrustFooterProps = {
  message: ChatMessage
  sourceCount: number
}

// Source count + degraded-mode + clinician-verify strip under each answer.
export function TrustFooter({ message, sourceCount }: TrustFooterProps) {
  if (!(sourceCount > 0 || message.warning || message.isDegraded)) return null
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold text-faint dark:text-[#6e857e]">
      <ShieldCheck size={12} aria-hidden="true" className="text-accent dark:text-accent-bright" />
      {sourceCount > 0 && <span>{sourceCount} verified {sourceCount === 1 ? 'source' : 'sources'}</span>}
      {message.isDegraded && <span className="text-[#b45309] dark:text-[#fcd34d]">· limited research mode</span>}
      <span>· AI guidance — verify with a clinician</span>
    </p>
  )
}

// Possible-matches meter: condition rows with confidence bars under an answer.
// Scores reflect the AI's listing ORDER (first = strongest), not probabilities.
export function MatchMeter({ matches }: { matches: MatchCandidate[] }) {
  if (matches.length === 0) return null
  return (
    <div className="mt-3 rounded-xl border border-line bg-card-subtle p-3 dark:border-[#22332c] dark:bg-[#21302b]/50" aria-label="Possible matches">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-accent dark:text-accent-bright">
        <Activity size={13} aria-hidden="true" /> Possible matches
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {matches.map((m) => (
          <div key={m.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px] font-bold text-ink dark:text-[#e8f0ee]">{m.label}</span>
              <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-accent dark:text-accent-bright">{m.score}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-line-soft dark:bg-[#0f1a17]" role="progressbar" aria-valuenow={m.score} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.label} match`}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-700 dark:bg-accent-bright" style={{ width: `${m.score}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] font-medium text-faint dark:text-[#6e857e]">AI ordering only — not a diagnosis probability. Verify with a clinician.</p>
    </div>
  )
}
export type FollowUpBarProps = {
  followUps: string[]
  actionClass: string
  onRegenerate?: () => void
  onSelectFollowUp: (text: string) => void
}

// Regenerate + suggested follow-up chips under the latest answer.
export function FollowUpBar(props: FollowUpBarProps) {
  if (props.followUps.length === 0 && !props.onRegenerate) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-line-soft pt-3 dark:border-[#22332c]">
      {props.onRegenerate && (
        <button type="button" onClick={props.onRegenerate} title="Generate a new answer" className={props.actionClass}>
          <RotateCcw size={12} aria-hidden="true" /><span>Regenerate</span>
        </button>
      )}
      {props.followUps.map((chip) => (
        <button key={chip} type="button" onClick={() => props.onSelectFollowUp(chip)} className="inline-flex min-h-[32px] items-center whitespace-nowrap rounded-full border border-accent-border bg-accent-soft px-3 text-[11px] font-bold text-accent transition hover:bg-accent hover:text-white dark:border-[#296659] dark:text-accent-bright dark:hover:bg-accent-bright dark:hover:text-[#0c1412]">
          {chip}
        </button>
      ))}
    </div>
  )
}
