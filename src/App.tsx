import ChatPage from './pages/ChatPage.tsx'
import LandingPage from './pages/LandingPage.tsx'
import { usePathname } from './lib/route.ts'

export default function App() {
  const pathname = usePathname()
  // Chat lives at /app; everything else is the landing page.
  if (pathname === '/app' || pathname.startsWith('/app/')) return <ChatPage />
  return <LandingPage />
}
