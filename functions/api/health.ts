export async function onRequest() {
  return new Response(JSON.stringify({ ok: true, service: 'medik-triage' }), { headers: { 'Content-Type': 'application/json' } })
}
