import { RotateCcw, ShieldCheck } from 'lucide-react'
import type { ChatMessage } from '../../types/app'

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
