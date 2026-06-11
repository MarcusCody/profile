import { Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GitHubIcon, LinkedInIcon } from '@/components/icons'
import { profile } from '../data/resume'

export default function Hero() {
  return (
    <section
      className="container mx-auto max-w-5xl px-6 pb-12 pt-16 md:pt-28"
      aria-label="Introduction"
    >
      <p className="mb-3 font-mono text-sm text-primary">{profile.location}</p>
      <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
        {profile.name}
      </h1>
      <p className="mt-3 text-xl font-semibold text-muted-foreground md:text-2xl">
        {profile.title}
      </p>
      <p className="mt-6 max-w-3xl text-muted-foreground">{profile.summary}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <a href={profile.whatsapp} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden="true" />
            WhatsApp me
          </a>
        </Button>
        <Button asChild variant="secondary">
          <a href={`mailto:${profile.email}`}>
            <Mail aria-hidden="true" />
            Email me
          </a>
        </Button>
        <Button asChild variant="ghost">
          <a href={profile.github} target="_blank" rel="noreferrer">
            <GitHubIcon aria-hidden="true" />
            GitHub
          </a>
        </Button>
        <Button asChild variant="ghost">
          <a href={profile.linkedin} target="_blank" rel="noreferrer">
            <LinkedInIcon aria-hidden="true" />
            LinkedIn
          </a>
        </Button>
      </div>
    </section>
  )
}
