import { cleanText, htmlToText, safePublicUrl } from '../helpers.ts'

export async function webSearch(query: string) {
  const searchQuery = cleanText(query, 120)
  if (!searchQuery) return { error: 'Search query is empty.' }

  const tavilyKey = process.env.TAVILY_API_KEY || ''
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query: searchQuery, search_depth: 'basic', include_answer: false, max_results: 3 })
      })
      if (res.ok) {
        const data = await res.json() as { results?: Array<{ title: string; url: string; content: string; published_date?: string }> }
        return {
          query: searchQuery,
          provider: 'Tavily Search API',
          results: (data.results || []).slice(0, 3).map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content.slice(0, 280),
            publishedDate: r.published_date || undefined
          }))
        }
      }
    } catch { /* fallback */ }
  }

  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, { headers: { 'User-Agent': 'MedikHealthDemo/1.0 (medical research assistant)' }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return { error: `Search provider returned HTTP ${response.status}.` }
    const html = await response.text()
    const matches = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)]
      .slice(0, 4)
      .map((match) => {
        const rawUrl = match[1]
        let url = rawUrl
        if (rawUrl.includes('uddg=')) {
          const regex = rawUrl.match(/uddg=([^&]+)/)
          if (regex) url = decodeURIComponent(regex[1])
        }
        const isOfficialMedical = /who\.int|cdc\.gov|mayoclinic\.org|nih\.gov|nhs\.uk/i.test(url)
        return { title: htmlToText(match[2]), url, snippet: htmlToText(match[3]).slice(0, 260), isOfficialMedical }
      })
    const results = matches.sort((a, b) => (b.isOfficialMedical ? 1 : 0) - (a.isOfficialMedical ? 1 : 0)).slice(0, 3)
    return { query: searchQuery, provider: 'DuckDuckGo Live Search Engine', results }
  } catch {
    return { query: searchQuery, results: [], error: 'Web search engine is currently unreachable.' }
  }
}

export async function searchPubMed(query: string) {
  const searchQuery = cleanText(query, 120)
  if (!searchQuery) return { error: 'Query is empty.' }
  try {
    const searchRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(searchQuery)}&retmode=json&retmax=2`, { signal: AbortSignal.timeout(4000) })
    if (!searchRes.ok) return { error: 'PubMed search endpoint unavailable.' }
    const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } }
    const idList: string[] = searchData?.esearchresult?.idlist || []
    if (idList.length === 0) return { query: searchQuery, results: [], note: 'No clinical studies matched.' }
    const summaryRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${idList.join(',')}&retmode=json`, { signal: AbortSignal.timeout(4000) })
    if (!summaryRes.ok) return { error: 'PubMed summary endpoint unavailable.' }
    const summaryData = await summaryRes.json() as { result?: Record<string, { title?: string; source?: string; pubdate?: string }> }
    const result = summaryData?.result || {}
    const articles = idList.map((id) => {
      const item = result[id] || {}
      return { pmcId: `PMC${id}`, title: item.title ? cleanText(item.title, 200) : 'Clinical Study', journal: item.source || 'Medical Journal', pubDate: item.pubdate || 'Recent', url: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/` }
    })
    return { query: searchQuery, database: 'PubMed Central (NCBI)', articles }
  } catch { return { query: searchQuery, error: 'NCBI PubMed search timed out.' } }
}

export async function queryMedlinePlus(topic: string) {
  const cleanTopic = cleanText(topic, 100)
  if (!cleanTopic) return { error: 'Topic is empty.' }
  try {
    const res = await fetch(`https://medlineplus.gov/v1/search?term=${encodeURIComponent(cleanTopic)}&db=healthTopics`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) })
    if (!res.ok) return { error: 'MedlinePlus service unavailable.' }
    const data = await res.json() as { feed?: { entry?: Array<{ title?: { _value?: string } | string; link?: Array<{ href?: string }> | { href?: string }; summary?: { _value?: string }; updated?: { _value?: string } }> } }
    const items = (data?.feed?.entry || []).slice(0, 2).map((entry) => ({
      title: typeof entry.title === 'object' ? entry.title._value : entry.title || cleanTopic,
      url: Array.isArray(entry.link) ? entry.link[0]?.href : entry.link?.href || 'https://medlineplus.gov',
      snippet: entry.summary?._value ? htmlToText(entry.summary._value).slice(0, 240) : 'NIH Health Topic Information.',
      updated: entry.updated?._value || undefined
    }))
    return { topic: cleanTopic, source: 'NIH MedlinePlus', topics: items }
  } catch { return { topic: cleanTopic, error: 'MedlinePlus service timed out.' } }
}

export async function fetchWebPage(value: string) {
  const url = safePublicUrl(value)
  if (!url) return { error: 'Only public HTTP(S) pages can be fetched.' }
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,application/xhtml+xml,text/plain' }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return { url: url.href, error: `Page returned HTTP ${response.status}.` }
    const contentType = response.headers.get('content-type') ?? ''
    const body = await response.text()
    if (!contentType.includes('html')) return { url: url.href, title: url.hostname, text: cleanText(body, 4000) }
    const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? htmlToText(titleMatch[1]) : url.hostname
    const textContent = htmlToText(body).slice(0, 5000)
    return { url: url.href, readerMode: true, article: { title, text: textContent } }
  } catch { return { url: url.href, error: 'Webpage fetch timed out.' } }
}
