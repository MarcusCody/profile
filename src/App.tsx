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

  useEffect(() => {
    api
      .getContent()
      .then(setContent)
      .catch((err) => {
        console.error('Failed to load content', err)
        setError(true)
      })
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
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
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
