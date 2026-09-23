import { onRequest } from '../functions/api/v1/ai/chat.ts'

const mockContext = {
  request: new Request('https://medik.pages.dev/api/v1/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'I have a fever' }], stream: false }),
  }),
  env: { GROQ_API_KEY: 'gsk_test123', GROQ_MODEL: 'openai/gpt-oss-120b' },
  waitUntil: async () => {},
}

const response = await onRequest(mockContext as any)
const text = await response.text()
console.log('Status:', response.status)
console.log('Response:', text.slice(0, 500))
