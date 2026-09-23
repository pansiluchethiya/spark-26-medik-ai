// Local safety response when every external provider fails.
const responseCache = new Map<string, string>()

const MEDICAL_HINT = /(pain|hurt|ache|fever|sick|symptom|doctor|disease|ill|nausea|dizz|cough|cold|flu\b|rashes?|bleed|swell|infect|allerg|treat|diagnos|medicat|medicine|pill|hospital|clinic|injur|wound|headache|stomach|chest|throat|breath|heart|blood|virus|bacteria|cancer|diabet|pressure|sugar|sleeps?|anxiet|depress|mental|body|health|urgent|emergency|help)/i

const CASUAL_PATTERNS: Array<{ test: RegExp; reply: string }> = [
  { test: /^(hi+|hello+|hey+|yo|sup|howdy|good\s?(morning|afternoon|evening|day|night))\b[!.~ ]*$/i, reply: 'Hello! I’m Medik, your health companion. Tell me what’s going on — describe any symptoms in your own words — or just ask me anything.' },
  { test: /^(thanks?|thank you|thx|ty)\b/i, reply: 'You’re welcome! Feel free to ask if anything else comes up — health questions or otherwise.' },
  { test: /^(bye|goodbye|good ?night|see you|cya)\b/i, reply: 'Take care! I’m here whenever you need anything.' },
  { test: /how are you|how('s| is) it going|how do you feel/i, reply: 'I’m running well, thanks for asking! How are *you* feeling — anything I can help with today?' },
  { test: /who are you|your name|what are you/i, reply: 'I’m Medik — an AI health companion. I can chat, look things up, and help you think through symptoms and next steps (though I’m no substitute for a clinician).' },
  { test: /what can you do|help me|how do (you|u) work|what do you do/i, reply: 'I can chat about anything, search current information, and — my main job — help you understand symptoms: likely categories, red flags, and sensible next steps. What’s on your mind?' },
]

// Casual small-talk gets a plain friendly reply (no section tags, so the
// app renders a normal chat bubble instead of the health UI).
function casualReply(prompt: string): string | null {
  const lower = prompt.toLowerCase().trim()
  if (lower.length > 160 || MEDICAL_HINT.test(lower)) return null
  for (const { test, reply } of CASUAL_PATTERNS) {
    if (test.test(lower)) return reply
  }
  return null
}

export function generateLocalFallbackResponse(userPrompt: string): string {
  const lower = userPrompt.toLowerCase().trim()
  const cached = responseCache.get(lower)
  if (cached) return cached

  const casual = casualReply(userPrompt)
  if (casual) {
    responseCache.set(lower, casual)
    return casual
  }

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
