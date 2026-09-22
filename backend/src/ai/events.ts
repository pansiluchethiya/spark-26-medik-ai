// SSE event emitters: warnings only (agent steps removed for speed and cleaner UX)
export function emitAgentSteps(_response: { write(chunk: string): unknown }, _userPrompt: string, _providerName: string) {
  // no-op: removed per request to keep UI friendly
}

export function emitWarning(response: { write(chunk: string): unknown }, message: string) {
  response.write(`data: ${JSON.stringify({ warning: message })}\n\n`)
}
