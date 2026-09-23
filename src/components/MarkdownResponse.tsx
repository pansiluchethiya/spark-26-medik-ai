import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { cn } from '../lib/cn'
import { normalizeSections, splitNormalized, stripSectionTags } from '../lib/sections'
import { HeartPulse, ShieldAlert, ListChecks, BookOpen, Info } from 'lucide-react'

type MarkdownSectionKind = 'assessment' | 'urgent' | 'selfcare' | 'sources' | 'body'
type MarkdownSection = { title: string; content: string; kind: MarkdownSectionKind }
type SourceCardData = { title: string; url: string; domain: string; excerpt: string }

function sectionKindFromTitle(title: string): MarkdownSectionKind {
  const n = title.toLowerCase()
  if (/urgent|emergency|red flag|when to seek|warning/i.test(n)) return 'urgent'
  if (/self[- ]?care|what you can do|next steps|what to do|home care|care steps/i.test(n)) return 'selfcare'
  if (/source|reference|citation|further reading/i.test(n)) return 'sources'
  if (/assessment|what this could be|possible|likely|understanding|overview/i.test(n)) return 'assessment'
  return 'body'
}

function splitSections(content: string): MarkdownSection[] {
  // Normalize tolerant tag variants ([SECTION: x], **[SECTION:x]**, inline)
  // then split on tag lines — every section always parses.
  const normalized = normalizeSections(content)
  const blocks = splitNormalized(normalized)
  if (blocks.length) {
    const toSection = (kind: string, body: string): MarkdownSection => {
      const raw = kind.toLowerCase()
      if (raw === 'assessment') return { title: 'What this could be', content: body, kind: 'assessment' }
      if (raw === 'urgent') return { title: 'When to seek care quickly', content: body, kind: 'urgent' }
      if (raw === 'selfcare' || raw === 'actions') return { title: 'What you can do now', content: body, kind: 'selfcare' }
      if (raw === 'sources') return { title: 'Sources & further reading', content: body, kind: 'sources' }
      return { title: 'Overview', content: body, kind: 'body' }
    }
    return blocks.map((b) => toSection(b.kind, stripSectionTags(b.body)))
  }
  // Fallback: split by markdown headings
  const lines = content.split(/\r?\n/)
  const sections: MarkdownSection[] = []
  let currentTitle = ''
  let currentContent: string[] = []
  const push = () => {
    const text = currentContent.join('\n').trim()
    if (!text && !currentTitle.trim()) return
    const kind = currentTitle ? sectionKindFromTitle(currentTitle) : 'assessment'
    const title = currentTitle.trim() || (kind === 'assessment' ? 'Overview' : kind === 'urgent' ? 'When to seek care quickly' : kind === 'selfcare' ? 'What you can do now' : 'Sources & further reading')
    sections.push({ title, content: text, kind })
  }
  const normalizeTitle = (title: string) => {
    const t = title.trim().replace(/^#+\s*/, '').replace(/\*+/g, '').trim()
    const l = t.toLowerCase()
    if (l.includes('what this could be') || l.includes('assessment')) return 'What this could be'
    if (l.includes('urgent') || l.includes('red flag') || l.includes('seek care')) return 'When to seek care quickly'
    if (l.includes('what you can do') || l.includes('self') || l.includes('next step')) return 'What you can do now'
    if (l.includes('source') || l.includes('reference')) return 'Sources & further reading'
    return t
  }
  const isHeading = (line: string) => /^\s*(?:\*\*)?#{1,6}\s*(?:\*\*)?.+/.test(line)
  for (const line of lines) {
    if (isHeading(line)) {
      push()
      const m = line.match(/^\s*(?:\*\*)?#{1,6}\s*(?:\*\*)?(.+?)(?:\*\*)?\s*:?\s*$/)
      currentTitle = m ? normalizeTitle(m[1]) : ''
      currentContent = []
      continue
    }
    currentContent.push(line)
  }
  push()
  // If single big block with no headings, ensure at least one section
  if (sections.length === 0 && content.trim()) sections.push({ title: 'Overview', content: content.trim(), kind: 'assessment' })
  return sections.filter(s => s.content.trim() || s.title.trim())
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="min-w-0 break-words text-[14px] leading-[1.65] text-ink dark:text-[#e8f0ee] [&>p]:mb-3 [&>p:last-child]:mb-0 [&_a]:font-semibold [&_a]:text-accent [&_a]:underline-offset-2 [&_a]:[overflow-wrap:anywhere] hover:[&_a]:underline dark:[&_a]:text-accent-bright [&_blockquote]:my-3 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:bg-card-subtle [&_blockquote]:px-4 [&_blockquote]:py-2.5 [&_blockquote]:text-muted dark:[&_blockquote]:bg-[#21302b] [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[16px] [&_h3]:font-bold [&_h4]:mb-1.5 [&_h4]:mt-3 [&_h4]:text-[14px] [&_h4]:font-bold [&_hr]:my-4 [&_hr]:border-line [&_li]:my-1 [&_li]:break-words [&_ol]:mb-3 [&_ol]:min-w-0 [&_ol]:pl-6 [&_ul]:mb-3 [&_ul]:min-w-0 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:list-decimal [&_strong]:font-bold [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px] [&_td]:break-words [&_td]:border [&_td]:border-line-soft [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:border-line-soft [&_th]:bg-card-subtle [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold dark:[&_th]:bg-[#21302b] [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_pre]:max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ children, href, ...props }) => <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>,
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
          table: ({ children }) => <div className="my-3 w-full max-w-full overflow-x-auto rounded-lg border border-line dark:border-[#2c4039]"><table>{children}</table></div>,
          code: ({ children, className, ...props }) => <code className={className ? `rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[0.9em] text-accent dark:bg-[#21302b] dark:text-accent-bright ${className}` : 'rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[0.9em] text-accent dark:bg-[#21302b] dark:text-accent-bright'} {...props}>{children}</code>,
          pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-xl bg-[#2c3835] p-4 text-[13px] text-[#f6eee8] dark:bg-black/40">{children}</pre>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function sourceCardsFromMarkdown(content: string): SourceCardData[] {
  const markdownLinks = [...content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)]
  const sourceLines = content.split(/\r?\n/)
  const cards = markdownLinks
    .map(([, title, url]) => {
      try {
        const parsedUrl = new URL(url)
        return { title: title.trim(), url, domain: parsedUrl.hostname.replace(/^www\./, ''), excerpt: '' }
      } catch { return null }
    })
    .filter(Boolean) as SourceCardData[]
  for (const line of sourceLines) {
    const rawLink = line.match(/https?:\/\/[^\s)]+/)
    if (!rawLink) continue
    const url = rawLink[0]
    try {
      const parsedUrl = new URL(url)
      const title = line.replace(rawLink[0], '').replace(/^\s*[-*]\s*\d*\.?\s*/, '').replace(/^[\s•-]+/, '').replace(/\s+/g, ' ').trim()
      const cleanedTitle = title || parsedUrl.hostname.replace(/^www\./, '')
      if (!cards.some((card) => card.url === url)) cards.push({ title: cleanedTitle, url, domain: parsedUrl.hostname.replace(/^www\./, ''), excerpt: '' })
    } catch { /* ignore */ }
  }
  return cards
}

function SourceCards({ content }: { content: string }) {
  const cards = sourceCardsFromMarkdown(content)
  if (!cards.length) return <MarkdownContent content={content} />
  return (
    <div>
      <p className="mb-2.5 text-xs font-medium text-muted dark:text-[#9eb5ae]">Tap to verify — these are the references used for this answer</p>
      <div className="grid gap-2">
        {cards.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex min-h-[56px] items-center gap-3 rounded-xl border border-line bg-card p-2.5 shadow-sm transition hover:-translate-y-px hover:border-accent hover:shadow-md dark:border-[#2c4039] dark:bg-[#192622]">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent text-[13px] font-bold text-white dark:bg-[#257d6e]" aria-hidden="true">{source.domain.slice(0, 1).toUpperCase()}</span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint dark:text-[#6e857e]">{source.domain}</span>
              <span className="truncate text-[13px] font-bold text-accent dark:text-accent-bright">{source.title}</span>
            </span>
            <span className="ml-auto text-base font-bold text-accent dark:text-accent-bright" aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </div>
  )
}

const sectionConfig: Record<MarkdownSectionKind, { style: string; icon: typeof HeartPulse; badge: string }> = {
  assessment: { style: 'border-line bg-card dark:border-[#2c4039] dark:bg-[#192622]', icon: HeartPulse, badge: 'bg-accent text-white dark:bg-[#257d6e] dark:text-white' },
  selfcare: { style: 'border-accent-border bg-accent-soft/70 dark:border-[#296659] dark:bg-[#21302b]', icon: ListChecks, badge: 'bg-accent text-white dark:bg-[#257d6e] dark:text-white' },
  urgent: { style: 'border-amber-200 bg-amber-50 dark:border-[#8a6a10] dark:bg-[#2b2410]', icon: ShieldAlert, badge: 'bg-amber-500 text-white' },
  sources: { style: 'border-line bg-card-subtle dark:border-[#22332c] dark:bg-[#21302b]/50', icon: BookOpen, badge: 'bg-accent text-white dark:bg-[#257d6e] dark:text-white' },
  body: { style: 'border-line bg-card dark:border-[#2c4039] dark:bg-[#192622]', icon: Info, badge: 'bg-faint text-white' },
}

export function hasHealthUI(content: string): boolean {
  if (/\[SECTION:\s*(assessment|urgent|selfcare|sources|actions|body)\s*\]/i.test(content)) return true
  return /^\s*#{1,6}\s+\S/m.test(content)
}

export function MarkdownResponse({ content }: { content: string }) {
  // NOTE: do NOT strip tags before splitting — splitSections needs them
  // as boundaries (it already strips leftovers from each body).
  // Casual (non-health) replies render as a plain bubble — no section cards.
  if (!hasHealthUI(content)) {
    return <MarkdownContent content={content} />
  }
  const sections = splitSections(content)
  return (
    <div className="grid min-w-0 gap-3">
      {sections.map((section, index) => {
        const cfg = sectionConfig[section.kind] ?? sectionConfig.body
        const Icon = cfg.icon
        return (
          <section key={`${section.title}-${index}`} className={cn('min-w-0 max-w-full rounded-2xl border p-4 shadow-sm sm:px-[18px]', cfg.style)}>
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px]', cfg.badge)} aria-hidden="true"><Icon size={13} /></span>
              <h3 className="text-sm font-bold text-ink dark:text-[#e8f0ee]">{section.title}</h3>
            </div>
            {section.kind === 'sources' ? <SourceCards content={section.content} /> : <MarkdownContent content={section.content} />}
          </section>
        )
      })}
    </div>
  )
}
