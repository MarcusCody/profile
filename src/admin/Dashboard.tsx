import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api, type ResumeContent, type SessionUser } from '@/lib/api'
import { adminSections } from './sections.config'
import ProfileEditor from './ProfileEditor'
import SectionEditor from './SectionEditor'

export default function Dashboard({
  user,
  onLogout,
}: {
  user: SessionUser
  onLogout: () => void
}) {
  const [content, setContent] = useState<ResumeContent | null>(null)

  function reload() {
    api.getContent().then(setContent)
  }

  useEffect(() => {
    reload()
  }, [])

  async function logout() {
    await api.logout()
    onLogout()
  }

  return (
    <div className="container mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Admin</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              View site
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>

      {!content ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <ProfileEditor profile={content.profile} />
          {adminSections.map((section) => (
            <SectionEditor
              key={section.path}
              section={section}
              items={(content as any)[sectionKey(section.path)]}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function sectionKey(path: string): keyof ResumeContent {
  const map: Record<string, keyof ResumeContent> = {
    'skill-groups': 'skillGroups',
    experiences: 'experiences',
    projects: 'projects',
    education: 'education',
    awards: 'awards',
  }
  return map[path]
}
