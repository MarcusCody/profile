import { Mail, MessageCircle } from 'lucide-react'
import { GitHubIcon, LinkedInIcon } from '@/components/icons'
import { useResume } from '@/lib/resume-context'

export default function Footer() {
  const { profile } = useResume()
  const contactLinks = [
    { href: `mailto:${profile.email}`, label: profile.email, icon: Mail, external: false },
    { href: profile.whatsapp, label: `WhatsApp · ${profile.phone}`, icon: MessageCircle, external: true },
    { href: profile.github, label: profile.github.replace(/^https?:\/\//, ''), icon: GitHubIcon, external: true },
    { href: profile.linkedin, label: profile.linkedin.replace(/^https?:\/\//, ''), icon: LinkedInIcon, external: true },
  ]
  return (
    <footer className="mt-12 border-t bg-card/50 pb-8 pt-12">
      <div className="container mx-auto flex max-w-5xl flex-wrap justify-between gap-8 px-6">
        <div>
          <h2 className="text-xl font-bold">Let&apos;s build something.</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Open to conversations about frontend architecture, SaaS products, and
            engineering leadership.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {contactLinks.map(({ href, label, icon: Icon, external }) => (
            <li key={href}>
              <a
                href={href}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="container mx-auto mt-10 max-w-5xl px-6 text-sm text-muted-foreground">
        © {new Date().getFullYear()} {profile.name}. Built with React, Vite, and
        shadcn/ui.
      </p>
    </footer>
  )
}
