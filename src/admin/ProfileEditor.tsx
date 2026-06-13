import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api, type ResumeContent } from '@/lib/api'
import { profileFields } from './sections.config'

export default function ProfileEditor({ profile }: { profile: ResumeContent['profile'] }) {
  const [form, setForm] = useState<Record<string, string>>({ ...profile })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true)
    setSaved(false)
    try {
      await api.updateProfile(form)
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {profileFields.map((f) => (
          <div key={f.name} className="flex flex-col gap-1.5">
            <Label>{f.label}</Label>
            {f.type === 'textarea' ? (
              <Textarea
                value={form[f.name] ?? ''}
                rows={4}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              />
            ) : (
              <Input
                value={form[f.name] ?? ''}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy}>
            Save profile
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
        </div>
      </CardContent>
    </Card>
  )
}
