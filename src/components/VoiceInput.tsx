import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

type SpeechRecognitionEventLike = Event & { results: { length: number; [index: number]: { [index: number]: { transcript: string } } } }
type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike
declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor } }

export function VoiceInput({ disabled, onTranscript }: { disabled?: boolean; onTranscript: (t: string) => void }) {
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => () => recRef.current?.stop(), [])

  const toggle = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) { setSupported(false); return }
    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      const txt = e.results[e.results.length - 1]?.[0]?.transcript
      if (txt) onTranscript(txt)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    try { rec.start(); setListening(true) } catch { setSupported(false) }
  }

  return (
    <span className="relative inline-flex">
      {listening && <span className="absolute inset-0 animate-ping rounded-full bg-accent/30 dark:bg-accent-bright/30" aria-hidden="true" />}
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={listening ? 'Stop listening' : 'Start voice input'}
        title={supported ? (listening ? 'Stop listening — tap again' : 'Voice input') : 'Voice not supported in this browser'}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border text-[13px] transition
          ${listening
            ? 'border-[#dc2626]/30 bg-[#dc2626] text-white shadow-md'
            : 'border-line bg-card-subtle text-muted hover:bg-accent-soft hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:text-[#9eb5ae]'}
          disabled:opacity-40`}
      >
        {listening ? <Square size={14} /> : <Mic size={16} />}
      </button>
    </span>
  )
}
