import { useEffect, useState } from 'react'
import { api, type SessionUser } from '@/lib/api'
import Login from './Login'
import Dashboard from './Dashboard'

export default function AdminApp() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    api
      .getMe()
      .then(setUser)
      .finally(() => setChecked(true))
  }, [])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user) return <Login />

  return <Dashboard user={user} onLogout={() => setUser(null)} />
}
