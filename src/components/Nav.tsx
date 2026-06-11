import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { profile } from '../data/resume'

const links = [
  { href: '#skills', label: 'Skills' },
  { href: '#experience', label: 'Experience' },
  { href: '#projects', label: 'Projects' },
  { href: '#education', label: 'Education' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-16 items-center border-b border-transparent transition-colors',
        scrolled && 'border-border bg-background/85 backdrop-blur-md',
      )}
    >
      <div className="container mx-auto flex max-w-5xl items-center justify-between gap-4 px-6">
        <a href="#main" className="font-mono text-lg font-bold">
          <span aria-hidden="true" className="text-primary">
            {'<'}
          </span>
          HJ
          <span aria-hidden="true" className="text-primary">
            {' />'}
          </span>
        </a>
        <Button
          variant="outline"
          size="sm"
          className="md:hidden"
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </Button>
        <nav
          id="nav-menu"
          aria-label="Primary"
          className={cn(
            'absolute inset-x-0 top-16 flex-col items-stretch gap-4 border-b bg-background/95 px-6 pb-6 pt-4 backdrop-blur-md',
            'md:static md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none',
            menuOpen ? 'flex' : 'hidden',
          )}
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Button asChild size="sm">
            <a href={`mailto:${profile.email}`} onClick={() => setMenuOpen(false)}>
              Contact
            </a>
          </Button>
        </nav>
      </div>
    </header>
  )
}
