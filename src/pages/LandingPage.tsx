import { AlertTriangle, ArrowRight, Globe, Mic, Search, ShieldCheck, Stethoscope } from 'lucide-react'
import { navigate } from '../lib/route'

const features = [
  {
    icon: Search,
    title: 'Possible causes, explained',
    body: 'Describe symptoms in your own words and get evidence-informed differentials with a match meter — not a black box.',
  },
  {
    icon: AlertTriangle,
    title: 'Red-flag detection',
    body: 'Every answer calls out urgent warning signs and when to seek emergency care versus booking a routine visit.',
  },
  {
    icon: Globe,
    title: 'Grounded in live sources',
    body: 'The AI researches current medical guidance as it answers, with verified links to WHO, CDC, and MedlinePlus.',
  },
  {
    icon: Mic,
    title: 'Voice in, voice out',
    body: 'Dictate symptoms hands-free and have answers read aloud — built for low-effort moments when you feel unwell.',
  },
]

const steps = [
  { n: '1', title: 'Describe what’s wrong', body: 'Type or speak your symptoms, history, and what worries you most.' },
  { n: '2', title: 'AI researches live', body: 'The assistant searches current guidelines and weighs possibilities.' },
  { n: '3', title: 'Get your next step', body: 'See likely categories, red flags, and practical self-care to take to a clinician.' },
]

export default function LandingPage() {
  const openApp = () => navigate('/app')
  return (
    <div className="min-h-[100dvh] w-full bg-canvas text-ink dark:bg-[#121c19] dark:text-[#e8f0ee]">
      {/* Top bar */}
      <header className="mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between px-4 sm:h-[64px]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white dark:bg-accent-bright dark:text-[#0c1412]" aria-hidden="true"><Stethoscope size={18} /></span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent dark:text-accent-bright">Medik</p>
            <p className="-mt-0.5 text-[14px] font-extrabold leading-none">Triage</p>
          </div>
        </div>
        <button type="button" onClick={openApp} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-bold text-white shadow-sm hover:bg-accent-hover dark:bg-accent-bright dark:text-[#0c1412]">
          Open app <ArrowRight size={15} />
        </button>
      </header>

      {/* Hero */}
      <main className="mx-auto w-full max-w-[1080px] px-4">
        <section className="flex flex-col items-center py-12 text-center sm:py-20">
          <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent dark:bg-[#21302b] dark:text-accent-bright">AI triage &amp; diagnostic</span>
          <h1 className="mt-4 max-w-[640px] text-[32px] font-extrabold leading-tight tracking-tight sm:text-[48px]">
            Understand your symptoms in minutes.
          </h1>
          <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-muted dark:text-[#9eb5ae] sm:text-[16px]">
            Tell Medik what’s going on in plain language. Get possible causes, urgent warning signs,
            and clear next steps — grounded in current medical sources.
          </p>
          <div className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row">
            <button type="button" onClick={openApp} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-bold text-white shadow-md hover:bg-accent-hover dark:bg-accent-bright dark:text-[#0c1412]">
              Start free triage <ArrowRight size={17} />
            </button>
            <a href="#how" className="inline-flex h-12 items-center rounded-full border border-line px-7 text-[15px] font-bold text-ink hover:border-accent hover:text-accent dark:border-[#2c4039] dark:text-[#e8f0ee]">
              How it works
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-semibold text-faint dark:text-[#6e857e]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-accent dark:text-accent-bright" /> Available 24/7</span>
            <span className="inline-flex items-center gap-1.5"><Globe size={14} className="text-accent dark:text-accent-bright" /> Evidence-linked answers</span>
            <span className="inline-flex items-center gap-1.5"><Mic size={14} className="text-accent dark:text-accent-bright" /> Voice input &amp; read-aloud</span>
          </div>
        </section>

        {/* Features */}
        <section aria-label="Features" className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-card p-5 shadow-sm dark:border-[#2c4039] dark:bg-[#192622]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent dark:bg-[#21302b] dark:text-accent-bright" aria-hidden="true"><f.icon size={19} /></span>
              <h2 className="mt-3 text-[16px] font-extrabold">{f.title}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted dark:text-[#9eb5ae]">{f.body}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section id="how" aria-label="How it works" className="py-10 sm:py-14">
          <h2 className="text-center text-[22px] font-extrabold tracking-tight sm:text-[26px]">Three steps to clarity</h2>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-line bg-card p-5 text-center shadow-sm dark:border-[#2c4039] dark:bg-[#192622]">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent text-[16px] font-extrabold text-white dark:bg-accent-bright dark:text-[#0c1412]" aria-hidden="true">{s.n}</span>
                <h3 className="mt-3 text-[15px] font-extrabold">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted dark:text-[#9eb5ae]">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button type="button" onClick={openApp} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-bold text-white shadow-md hover:bg-accent-hover dark:bg-accent-bright dark:text-[#0c1412]">
              Try it now <ArrowRight size={17} />
            </button>
          </div>
        </section>

        {/* Disclaimer */}
        <section aria-label="Disclaimer" className="mb-8 rounded-2xl border border-urgent-border bg-urgent-bg p-5 text-center dark:bg-[#dc2626]/10">
          <p className="mx-auto max-w-[620px] text-[13px] font-semibold leading-relaxed text-urgent-strong">
            Medik Triage is AI information only — not a medical diagnosis. Always verify important
            information with a qualified clinician. If this is an emergency, call emergency services now.
          </p>
        </section>
      </main>

      <footer className="border-t border-line py-5 text-center text-[11px] font-medium text-faint dark:border-[#2c4039] dark:text-[#6e857e]">
        Medik Triage · AI information only — not a medical diagnosis
      </footer>
    </div>
  )
}
