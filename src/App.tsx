import { useEffect, useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Skills from './components/Skills'
import Experience from './components/Experience'
import Projects from './components/Projects'
import EducationAwards from './components/EducationAwards'
import Footer from './components/Footer'
import { api, type ResumeContent } from '@/lib/api'
import { ResumeProvider } from '@/lib/resume-context'

export default function App() {
  const [content, setContent] = useState<ResumeContent | null>(null)
  const [error, setError] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    let cancelled = false
    // The free database auto-pauses; the first request can take ~30-60s to
    // wake it. Show a friendlier message if loading runs long, and retry a
    // few times before giving up.
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlow(true)
    }, 4000)

    async function load() {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const data = await api.getContent()
          if (!cancelled) setContent(data)
          return
        } catch (err) {
          console.error(`Failed to load content (attempt ${attempt + 1})`, err)
          if (attempt < 3)
            await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      }
      if (!cancelled) setError(true)
    }

    void load().finally(() => clearTimeout(slowTimer))

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
    }
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">
        Could not load profile content. Please try again later.
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <span>Loading…</span>
        {slow && (
          <span className="text-sm">
            Waking up the server — this can take up to a minute on first visit.
          </span>
        )}
      </div>
    )
  }

  return (
    <ResumeProvider value={content}>
      <a
        href="#main"
        className="absolute -top-12 left-4 z-[100] rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground transition-[top] focus:top-4"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Skills />
        <Experience />
        <Projects />
        <EducationAwards />
      </main>
      <Footer />
    </ResumeProvider>
  )
}
