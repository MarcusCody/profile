import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react'
import { api, type ChatMessage, type FitResult as FitResultData } from '@/lib/api'
import { useResume } from '@/lib/resume-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import FitResult from './FitResult'

type Tab = 'fit' | 'chat'

const SUGGESTED_QUESTIONS = [
  'What is their backend experience?',
  'Summarize their most impressive project.',
  'Which front-end technologies do they know?',
  'Have they led a team?',
]

export default function AssistantWidget() {
  const { profile } = useResume()
  const firstName = profile.name.split(' ')[0]

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('fit')

  // Fit-check state
  const [jd, setJd] = useState('')
  const [fitLoading, setFitLoading] = useState(false)
  const [fitError, setFitError] = useState<string | null>(null)
  const [fitResult, setFitResult] = useState<FitResultData | null>(null)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tab === 'chat') {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    }
  }, [messages, tab])

  async function runFit() {
    if (!jd.trim() || fitLoading) return
    setFitLoading(true)
    setFitError(null)
    setFitResult(null)
    try {
      setFitResult(await api.fitCheck(jd))
    } catch {
      setFitError('Could not analyze that job description. Please try again.')
    } finally {
      setFitLoading(false)
    }
  }

  async function sendChat(text: string) {
    const trimmed = text.trim()
    if (!trimmed || streaming) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages([...next, { role: 'assistant', content: '' }])
    setInput('')
    setChatError(null)
    setStreaming(true)
    try {
      for await (const delta of api.chatStream(next)) {
        setMessages((m) => {
          const copy = m.slice()
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, content: last.content + delta }
          return copy
        })
      }
    } catch {
      setChatError('Something went wrong. Please try again.')
      setMessages((m) => {
        const last = m[m.length - 1]
        return last?.role === 'assistant' && !last.content ? m.slice(0, -1) : m
      })
    } finally {
      setStreaming(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Sparkles className="size-5" aria-hidden="true" />
        Ask AI
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex h-[min(36rem,calc(100vh-2rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" aria-hidden="true" />
          <span className="font-semibold">Ask about {firstName}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
          className="rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b text-sm">
        <TabButton active={tab === 'fit'} onClick={() => setTab('fit')}>
          Job fit check
        </TabButton>
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>
          Ask anything
        </TabButton>
      </div>

      {tab === 'fit' ? (
        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <p className="text-sm text-muted-foreground">
            Paste a job description and I&apos;ll assess how {firstName} fits — with a
            match score, evidence, and honest gaps.
          </p>
          <Textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here…"
            className="min-h-28 resize-none"
            disabled={fitLoading}
          />
          <Button onClick={runFit} disabled={fitLoading || !jd.trim()}>
            {fitLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Analyzing…
              </>
            ) : (
              'Check fit'
            )}
          </Button>
          {fitError && <p className="text-sm text-rose-300">{fitError}</p>}
          {fitResult && <FitResult result={fitResult} />}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Ask me anything about {firstName}&apos;s background. Try:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendChat(q)}
                      className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-left text-xs text-primary hover:bg-primary/10"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'self-end bg-primary text-primary-foreground'
                      : 'self-start bg-background/60 text-foreground',
                  )}
                >
                  {m.content || (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  )}
                </div>
              ))
            )}
            {chatError && <p className="text-sm text-rose-300">{chatError}</p>}
          </div>
          <form
            className="flex items-end gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void sendChat(input)
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendChat(input)
                }
              }}
              placeholder="Type your question…"
              className="min-h-10 max-h-28 resize-none"
              rows={1}
              disabled={streaming}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={streaming || !input.trim()}
            >
              {streaming ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
            </Button>
          </form>
        </>
      )}

      <p className="border-t px-4 py-2 text-center text-[11px] text-muted-foreground">
        AI answers are grounded in {firstName}&apos;s profile and may be imperfect.
      </p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 px-4 py-2.5 font-medium transition-colors',
        active
          ? 'border-b-2 border-primary text-primary'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
