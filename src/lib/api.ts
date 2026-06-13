import type {
  Profile,
  SkillGroup,
  Experience,
  Project,
  Education,
  Award,
} from '@/data/resume'

export type WithId<T> = T & { id: number; sortOrder: number }

export interface ResumeContent {
  profile: Profile
  skillGroups: WithId<SkillGroup>[]
  experiences: WithId<Experience>[]
  projects: WithId<Project>[]
  education: WithId<Education>[]
  awards: WithId<Award>[]
}

export interface SessionUser {
  email: string
  name?: string
  provider: 'github' | 'google'
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  getContent: () => fetch('/api/content').then((r) => json<ResumeContent>(r)),

  getMe: async (): Promise<SessionUser | null> => {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.status === 401) return null
    const data = await json<{ user: SessionUser }>(res)
    return data.user
  },

  logout: () =>
    fetch('/auth/logout', { method: 'POST', credentials: 'include' }).then((r) =>
      json<{ ok: true }>(r),
    ),

  updateProfile: (body: Partial<Profile>) =>
    fetch('/api/profile', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<Profile>(r)),

  createItem: (path: string, body: unknown) =>
    fetch(`/api/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<any>(r)),

  updateItem: (path: string, id: number, body: unknown) =>
    fetch(`/api/${path}/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<any>(r)),

  deleteItem: async (path: string, id: number) => {
    const res = await fetch(`/api/${path}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
  },
}
