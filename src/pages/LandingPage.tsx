import { Activity, AlertTriangle, ArrowRight, Download, Globe, Mic, Search, ShieldCheck, Smartphone, Stethoscope } from 'lucide-react'
import { useEffect, useState } from 'react'
import { navigate } from '../lib/route'
import { RELEASES_PAGE, getLatestApk, type ReleaseApk } from '../lib/release'
import { Reveal, useInView } from '../components/Reveal'
import { cn } from '../lib/cn'

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

const mockMatches = [
  { label: 'Viral pharyngitis', score: 74 },
  { label: 'Strep throat', score: 59 },
  { label: 'Allergic irritation', score: 44 },
]

function HeroVisual() {
  const { ref, visible } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[420px]" aria-hidden="true">
      {/* Floating chips */}
      <div className="animate-float-slow absolute -left-2 top-6 z-10 flex items-center gap-1.5 rounded-2xl border border-line bg-card/90 px-3 py-2 text-[11px] font-bold shadow-md backdrop-blur sm:-left-8 dark:border-[#2c4039] dark:bg-[#192622]/90">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#dc2626]/10 text-[#dc2626]"><AlertTriangle size={13} /></span>
        <span>2 red flags checked</span>
      </div>
      <div className="animate-float absolute -right-2 bottom-10 z-10 flex items-center gap-1.5 rounded-2xl border border-line bg-card/90 px-3 py-2 text-[11px] font-bold shadow-md backdrop-blur sm:-right-6 dark:border-[#2c4039] dark:bg-[#192622]/90" style={{ animationDelay: '1.2s' }}>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-accent dark:bg-[#21302b] dark:text-accent-bright"><Globe size={13} /></span>
        <span>3 verified sources</span>
      </div>

      {/* Main mock card */}
      <div className="animate-pop relative rounded-3xl border border-line bg-card p-5 shadow-lg dark:border-[#2c4039] dark:bg-[#192622]" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-white"><Stethoscope size={16} /></span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-accent dark:text-accent-bright">Medik Triage</p>
            <p className="text-[12px] text-muted dark:text-[#9eb5ae]">Fever + sore throat · 2 days</p>
          </div>
          <span className="ml-auto flex items-center gap-1">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent dark:bg-accent-bright" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent dark:bg-accent-bright" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent dark:bg-accent-bright" />
          </span>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-accent dark:text-accent-bright">
          <Activity size={13} /> Possible matches
        </p>
        <div className="mt-2 flex flex-col gap-2.5">
          {mockMatches.map((m, i) => (
            <div key={m.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-bold">{m.label}</span>
                <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-accent dark:text-accent-bright">{m.score}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-line-soft dark:bg-[#0f1a17]">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-out dark:bg-accent-bright"
                  style={{ width: visible ? `${m.score}%` : '0%', transitionDelay: `${300 + i * 220}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const openApp = () => navigate('/app')
  const [apk, setApk] = useState<ReleaseApk | null>(null)
  const [apkLoading, setApkLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    getLatestApk(controller.signal)
      .then(setApk)
      .catch(() => {})
      .finally(() => setApkLoading(false))
    return () => controller.abort()
  }, [])
  return (
    <div className="min-h-[100dvh] w-full overflow-x-clip bg-canvas text-ink dark:bg-[#121c19] dark:text-[#e8f0ee]">
      {/* Top bar */}
      <header className="animate-fade mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between px-4 sm:h-[64px]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white shadow-sm transition-transform hover:scale-105" aria-hidden="true"><Stethoscope size={18} /></span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent dark:text-accent-bright">Medik</p>
            <p className="-mt-0.5 text-[14px] font-extrabold leading-none">Triage</p>
          </div>
        </div>
        <button type="button" onClick={openApp} className="btn-shine inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-bold text-white shadow-sm transition hover:-translate-y-px hover:bg-accent-hover hover:shadow-md active:translate-y-0 dark:bg-[#257d6e] dark:hover:bg-[#2f9483]">
          Open app <ArrowRight size={15} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-[1080px] px-4">
        {/* Hero */}
        <section className="relative py-10 sm:py-16">
          {/* Glow blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="animate-drift absolute -top-10 left-[8%] h-64 w-64 rounded-full bg-accent/15 blur-3xl dark:bg-accent-bright/10" />
            <div className="animate-drift absolute right-[4%] top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl dark:bg-accent-bright/[0.07]" style={{ animationDelay: '2.5s' }} />
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <span className="animate-pop inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-soft px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent dark:border-[#296659] dark:bg-[#21302b] dark:text-accent-bright">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-accent opacity-60 dark:bg-accent-bright" />
                  <span className="h-2 w-2 rounded-full bg-accent dark:bg-accent-bright" />
                </span>
                AI triage &amp; diagnostic
              </span>
              <h1 className="animate-rise mt-5 text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-[52px]" style={{ animationDelay: '0.1s' }}>
                Understand your <span className="text-gradient">symptoms</span> in minutes.
              </h1>
              <p className="animate-rise mx-auto mt-4 max-w-[540px] text-[15px] leading-relaxed text-muted sm:text-[16.5px] lg:mx-0 dark:text-[#9eb5ae]" style={{ animationDelay: '0.2s' }}>
                Tell Medik what’s going on in plain language. Get possible causes, urgent warning
                signs, and clear next steps — grounded in current medical sources.
              </p>
              <div className="animate-rise mt-7 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center lg:justify-start" style={{ animationDelay: '0.3s' }}>
                <button type="button" onClick={openApp} className="btn-shine inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg active:translate-y-0 dark:bg-[#257d6e] dark:hover:bg-[#2f9483]">
                  Start free triage <ArrowRight size={17} />
                </button>
                <a href="#how" className="inline-flex h-12 items-center rounded-full border border-line px-7 text-[15px] font-bold transition hover:-translate-y-0.5 hover:border-accent hover:text-accent dark:border-[#2c4039] dark:hover:text-accent-bright">
                  How it works
                </a>
              </div>
              <div className="animate-rise mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-semibold text-faint lg:justify-start dark:text-[#6e857e]" style={{ animationDelay: '0.4s' }}>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-accent dark:text-accent-bright" /> Available 24/7</span>
                <span className="inline-flex items-center gap-1.5"><Globe size={14} className="text-accent dark:text-accent-bright" /> Evidence-linked answers</span>
                <span className="inline-flex items-center gap-1.5"><Mic size={14} className="text-accent dark:text-accent-bright" /> Voice input &amp; read-aloud</span>
              </div>
            </div>
            <Reveal delay={150}><HeroVisual /></Reveal>
          </div>
        </section>

        {/* Get the Android app */}
        <Reveal>
          <section aria-label="Get the Android app" className="mb-4 flex flex-col items-center gap-4 rounded-2xl border border-line bg-card p-5 text-center shadow-sm sm:flex-row sm:text-left dark:border-[#2c4039] dark:bg-[#192622]">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-md dark:bg-[#257d6e]" aria-hidden="true"><Smartphone size={22} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-extrabold">Take Medik with you</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted dark:text-[#9eb5ae]">
                {apkLoading
                  ? 'Checking the latest release…'
                  : apk
                    ? `Android app v${apk.version} · ${apk.sizeMB} MB · direct from GitHub. Allow “install unknown apps” once when prompted.`
                    : 'Grab the Android build from the releases page.'}
              </p>
            </div>
            <a
              href={apk?.url ?? RELEASES_PAGE}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-6 text-[14px] font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg active:translate-y-0 dark:bg-[#257d6e] dark:hover:bg-[#2f9483]"
            >
              <Download size={16} />
              {apkLoading ? 'Checking…' : apk ? `Download APK · v${apk.version}` : 'See releases'}
            </a>
          </section>
        </Reveal>

        {/* Features */}
        <section aria-label="Features" className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 2) * 120}>
              <div className={cn('group h-full rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent-border hover:shadow-md dark:border-[#2c4039] dark:bg-[#192622] dark:hover:border-[#296659]')}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 dark:bg-[#21302b] dark:text-accent-bright" aria-hidden="true"><f.icon size={19} /></span>
                <h2 className="mt-3 text-[16px] font-extrabold">{f.title}</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted dark:text-[#9eb5ae]">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* How it works */}
        <section id="how" aria-label="How it works" className="relative py-10 sm:py-14">
          <Reveal><h2 className="text-center text-[22px] font-extrabold tracking-tight sm:text-[28px]">Three steps to <span className="text-gradient">clarity</span></h2></Reveal>
          <div className="relative mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-5 hidden border-t-2 border-dashed border-accent-border sm:block dark:border-[#296659]" aria-hidden="true" />
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 140}>
                <div className="relative rounded-2xl border border-line bg-card p-5 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-[#2c4039] dark:bg-[#192622]">
                  <span className="relative mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent text-[16px] font-extrabold text-white shadow-md ring-4 ring-canvas dark:bg-[#257d6e] dark:ring-[#121c19]" aria-hidden="true">{s.n}</span>
                  <h3 className="mt-3 text-[15px] font-extrabold">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted dark:text-[#9eb5ae]">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="mt-8 text-center">
              <button type="button" onClick={openApp} className="btn-shine inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg active:translate-y-0 dark:bg-[#257d6e] dark:hover:bg-[#2f9483]">
                Try it now <ArrowRight size={17} />
              </button>
            </div>
          </Reveal>
        </section>

        {/* Disclaimer */}
        <Reveal>
          <section aria-label="Disclaimer" className="mb-8 rounded-2xl border border-urgent-border bg-urgent-bg p-5 text-center dark:bg-[#dc2626]/10">
            <p className="mx-auto max-w-[620px] text-[13px] font-semibold leading-relaxed text-urgent-strong">
              Medik Triage is AI information only — not a medical diagnosis. Always verify important
              information with a qualified clinician. If this is an emergency, call emergency services now.
            </p>
          </section>
        </Reveal>
      </main>

      <footer className="border-t border-line py-5 text-center text-[11px] font-medium text-faint dark:border-[#2c4039] dark:text-[#6e857e]">
        Medik Triage · AI information only — not a medical diagnosis
      </footer>
    </div>
  )
}
