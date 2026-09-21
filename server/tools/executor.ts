import { fetchWebPage, queryMedlinePlus, searchPubMed, webSearch } from './research.ts'

export async function executeResearchTool(name: string, rawArguments: string) {
  const args = (() => {
    try { return JSON.parse(rawArguments) as Record<string, string> } catch { return null }
  })()
  if (!args) return { name, result: { error: 'Tool arguments were not valid JSON.' } }

  try {
    switch (name) {
      case 'web_search': return { name, result: await webSearch(args.query ?? '') }
      case 'search_pubmed': return { name, result: await searchPubMed(args.query ?? '') }
      case 'query_medlineplus': return { name, result: await queryMedlinePlus(args.topic ?? '') }
      case 'fetch_web_page': return { name, result: await fetchWebPage(args.url ?? '') }
      default: return { name, result: { error: `Unknown tool: ${name}` } }
    }
  } catch {
    return { name, result: { error: `${name} is temporarily unavailable. Do not invent current sources.` } }
  }
}
