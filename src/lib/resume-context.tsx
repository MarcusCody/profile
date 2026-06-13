import { createContext, useContext } from 'react'
import type { ResumeContent } from '@/lib/api'

const ResumeContext = createContext<ResumeContent | null>(null)

export function ResumeProvider({
  value,
  children,
}: {
  value: ResumeContent
  children: React.ReactNode
}) {
  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>
}

export function useResume(): ResumeContent {
  const ctx = useContext(ResumeContext)
  if (!ctx) throw new Error('useResume must be used within a ResumeProvider')
  return ctx
}
