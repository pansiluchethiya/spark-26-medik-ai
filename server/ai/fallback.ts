// Local safety response when every external provider fails.
const responseCache = new Map<string, string>()

export function generateLocalFallbackResponse(userPrompt: string): string {
  const lower = userPrompt.toLowerCase().trim()
  const cached = responseCache.get(lower)
  if (cached) return cached

  const asksBreathing = /(trouble breathing|difficulty breathing|shortness of breath|can't breathe|cannot breathe|breath)/i.test(lower)
  const hasRedFlag = /(chest pain|severe headache|sudden weakness|slurred speech|heavy bleeding|fainting|high fever|unconscious)/i.test(lower)

  const assessment = [
    '- Based on your description, a clinician would want more detail: onset, duration, severity, triggers, prior conditions, medications, allergies, and associated symptoms.',
    '- This information is educational and not a diagnosis. A primary-care clinician or urgent-care visit is the right next step for personalized evaluation.',
  ]
  if (asksBreathing) assessment.push('- Because breathing difficulty was mentioned, avoid self-medicating and seek prompt in-person assessment if worsening.')

  const urgent = hasRedFlag
    ? ['- You described a potential red flag. Seek immediate medical care or emergency services now.']
    : [
        '- Seek urgent help for: chest pain/pressure, severe shortness of breath, fainting, heavy bleeding, sudden weakness/speech changes, or high fever that does not improve.',
        ...(asksBreathing ? ['- If breathing is worsening, call emergency services or go to the nearest emergency department.'] : []),
      ]

  const selfcare = [
    '- Track symptoms: when they started, what makes them better/worse, recent exposures/illness, medications, and vital signs if available.',
    '- Avoid starting/stopping prescription medicines without clinician guidance. Bring a medication list to your visit.',
    '- If symptoms are persistent, worsening, or interfering with daily activity, book a prompt clinical review.',
  ]

  const sources = [
    '- World Health Organization (WHO): https://www.who.int',
    '- Centers for Disease Control and Prevention (CDC): https://www.cdc.gov',
    '- NIH MedlinePlus: https://medlineplus.gov',
  ]

  const responseText = `[SECTION:assessment]\n${assessment.join('\n')}\n\n[SECTION:urgent]\n${urgent.join('\n')}\n\n[SECTION:selfcare]\n${selfcare.join('\n')}\n\n[SECTION:sources]\n${sources.join('\n')}`

  responseCache.set(lower, responseText)
  return responseText
}
