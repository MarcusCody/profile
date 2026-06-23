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

export interface FitRequirement {
  requirement: string
  status: 'strong' | 'partial' | 'gap'
  evidence: string
}

export interface FitResult {
  score: number
  summary: string
  requirements: FitRequirement[]
  gaps: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

  fitCheck: (jobDescription: string) =>
    fetch('/api/fit-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription }),
    }).then((r) => json<FitResult>(r)),

  /**
   * Streams a chat reply, yielding text deltas as they arrive. Reads the SSE
   * body (`data: {"delta": "..."}` lines) emitted by POST /api/chat.
   */
  chatStream: async function* (
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    })
    if (!res.ok || !res.body) {
      throw new Error(`Chat failed: ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        const line = frame.trim()
        if (!line.startsWith('data:')) continue
        const payload = JSON.parse(line.slice(5).trim()) as {
          delta?: string
          done?: boolean
          error?: string
        }
        if (payload.error) throw new Error(payload.error)
        if (payload.done) return
        if (payload.delta) yield payload.delta
      }
    }
  },
}
