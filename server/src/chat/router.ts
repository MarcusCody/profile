import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { wrap } from '../http'
import type { ChatMessage, ChatProvider } from './provider'
import { buildChatSystemPrompt, buildFitCheckSystemPrompt } from './grounding'
import type { FitResult, FitRequirement } from './types'

const MAX_JD_CHARS = 8000
const MAX_MESSAGES = 20
const MAX_MESSAGE_CHARS = 2000

const FIT_STATUSES = new Set<FitRequirement['status']>(['strong', 'partial', 'gap'])

/** Validates and normalizes a parsed model response into a FitResult, or null. */
function parseFitResult(raw: string): FitResult | null {
  let data: any
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  if (typeof data.summary !== 'string') return null
  if (!Array.isArray(data.requirements)) return null

  const requirements: FitRequirement[] = []
  for (const r of data.requirements) {
    if (
      !r ||
      typeof r.requirement !== 'string' ||
      typeof r.evidence !== 'string' ||
      !FIT_STATUSES.has(r.status)
    ) {
      return null
    }
    requirements.push({
      requirement: r.requirement,
      status: r.status,
      evidence: r.evidence,
    })
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)))
  const gaps = Array.isArray(data.gaps)
    ? data.gaps.filter((g: unknown): g is string => typeof g === 'string')
    : []

  return { score, summary: data.summary, requirements, gaps }
}

/** Calls the provider for a fit check, retrying once on malformed JSON. */
async function runFitCheck(
  provider: ChatProvider,
  jobDescription: string,
): Promise<FitResult> {
  const system = await buildFitCheckSystemPrompt()
  const messages: ChatMessage[] = [
    { role: 'user', content: `Job description:\n\n${jobDescription}` },
  ]
  let lastRaw = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    lastRaw = await provider.complete(system, messages, { json: true })
    const parsed = parseFitResult(lastRaw)
    if (parsed) return parsed
  }
  throw new Error('fit_check_parse_failed')
}

function validMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) return false
  if (value.length > MAX_MESSAGES) return false
  return value.every(
    (m) =>
      m &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0 &&
      m.content.length <= MAX_MESSAGE_CHARS,
  )
}

export function chatRouter(provider: ChatProvider): Router {
  const r = Router()

  // Abuse guard. In-memory store is fine on a single (F1) instance.
  r.use(
    rateLimit({
      windowMs: 5 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'rate_limited' },
    }),
  )

  // Hero feature: structured job-description fit check.
  r.post(
    '/fit-check',
    wrap(async (req, res) => {
      const jd = req.body?.jobDescription
      if (typeof jd !== 'string' || !jd.trim()) {
        res.status(400).json({ error: 'invalid_input' })
        return
      }
      if (jd.length > MAX_JD_CHARS) {
        res.status(400).json({ error: 'too_long' })
        return
      }
      try {
        const result = await runFitCheck(provider, jd)
        res.json(result)
      } catch (err) {
        console.error('fit-check failed', err)
        res.status(502).json({ error: 'assistant_unavailable' })
      }
    }),
  )

  // Secondary feature: grounded free-form chat, streamed over SSE.
  r.post(
    '/chat',
    wrap(async (req, res) => {
      const messages = req.body?.messages
      if (!validMessages(messages)) {
        res.status(400).json({ error: 'invalid_input' })
        return
      }

      // May hit the DB (via grounding) — do it before opening the SSE stream so
      // failures here become a normal JSON error.
      const system = await buildChatSystemPrompt()

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders?.()

      try {
        for await (const delta of provider.streamReply(system, messages)) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`)
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
      } catch (err) {
        console.error('chat stream failed', err)
        res.write(`data: ${JSON.stringify({ error: 'assistant_unavailable' })}\n\n`)
      } finally {
        res.end()
      }
    }),
  )

  return r
}
