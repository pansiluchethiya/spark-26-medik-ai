import { Suspense, lazy, useEffect } from 'react'
import { usePathname } from './lib/route.ts'

const ChatPage = lazy(() => import('./pages/ChatPage.tsx'))
const LandingPage = lazy(() => import('./pages/LandingPage.tsx'))

export default function App() {
  const pathname = usePathname()
  // Chat lives at /app; everything else is the landing page.
  const isApp = pathname === '/app' || pathname.startsWith('/app/')
  useEffect(() => {
    document.title = isApp ? 'Medik Triage — AI Chat' : 'Medik Triage — AI Diagnostic'
  }, [isApp])
  return (
    <Suspense fallback={<div className="grid min-h-[100dvh] place-items-center bg-canvas" aria-label="Loading"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-accent" /></div>}>
      {isApp ? <ChatPage /> : <LandingPage />}
    </Suspense>
  )
}
