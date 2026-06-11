import Nav from './components/Nav'
import Hero from './components/Hero'
import Skills from './components/Skills'
import Experience from './components/Experience'
import Projects from './components/Projects'
import EducationAwards from './components/EducationAwards'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
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
    </>
  )
}
