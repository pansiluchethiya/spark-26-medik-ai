export const researchToolSchemas = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the live web for current medical information, guidelines, and official sources. Use once per turn for the main symptom query.',
      parameters: { type: 'object' as const, properties: { query: { type: 'string', description: 'Focused medical search query (5-10 words).' } }, required: ['query'], additionalProperties: false }
    }
  },
]
