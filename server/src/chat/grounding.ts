import { getContent } from '../sections'

type Content = Awaited<ReturnType<typeof getContent>>

const TTL_MS = 5 * 60 * 1000
let cache: { text: string; name: string; at: number } | null = null

/** Renders the resume content into a compact, readable text block for the LLM. */
function serialize(c: Content): string {
  const p = c.profile
  const lines: string[] = []

  lines.push(`# ${p.name} — ${p.title}`)
  lines.push(`Location: ${p.location}`)
  lines.push(`Summary: ${p.summary}`)

  lines.push('\n## Skills')
  for (const g of c.skillGroups) {
    lines.push(`- ${g.title}: ${g.skills.join(', ')}`)
  }

  lines.push('\n## Experience')
  for (const e of c.experiences) {
    lines.push(`### ${e.role} @ ${e.company} (${e.period}, ${e.location})`)
    for (const h of e.highlights) lines.push(`- ${h}`)
  }

  lines.push('\n## Projects')
  for (const pr of c.projects) {
    lines.push(`### ${pr.name}`)
    lines.push(pr.description)
    if (pr.tags.length) lines.push(`Tech: ${pr.tags.join(', ')}`)
  }

  lines.push('\n## Education')
  for (const ed of c.education) {
    lines.push(
      `- ${ed.qualification}, ${ed.institution} (${ed.period})${ed.detail ? ` — ${ed.detail}` : ''}`,
    )
  }

  lines.push('\n## Awards')
  for (const a of c.awards) {
    lines.push(
      `- ${a.title}, ${a.issuer} (${a.date})${a.description ? ` — ${a.description}` : ''}`,
    )
  }

  return lines.join('\n')
}

/**
 * Returns the serialized profile, cached in-memory for a few minutes. Caching
 * avoids waking the auto-paused serverless DB on every chat message.
 */
async function getGrounding(): Promise<{ text: string; name: string }> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return { text: cache.text, name: cache.name }
  }
  const content = await getContent()
  const text = serialize(content)
  cache = { text, name: content.profile.name, at: Date.now() }
  return { text, name: content.profile.name }
}

/** Test-only: clears the in-memory grounding cache. */
export function clearGroundingCache(): void {
  cache = null
}

export async function buildChatSystemPrompt(): Promise<string> {
  const { text, name } = await getGrounding()
  return [
    `You are an AI assistant embedded on ${name}'s professional profile website.`,
    `You answer questions from visitors (often recruiters or hiring managers) about ${name}'s background, skills, and experience.`,
    '',
    'Rules:',
    `- Answer ONLY using the profile data below. Never invent employers, dates, titles, projects, or skills.`,
    `- If something is not covered by the data, say you don't have that information and suggest contacting ${name} directly.`,
    '- Politely decline questions unrelated to this professional profile.',
    '- Be concise, specific, and professional. Prefer concrete evidence from the data.',
    `- Refer to ${name} in the third person.`,
    '',
    'PROFILE DATA:',
    text,
  ].join('\n')
}

export async function buildFitCheckSystemPrompt(): Promise<string> {
  const { text, name } = await getGrounding()
  return [
    `You assess how well ${name} fits a given job description, using ONLY the profile data below.`,
    'Never invent experience. If the data does not support a requirement, mark it as a gap.',
    '',
    'Respond with a single JSON object matching exactly this TypeScript type:',
    '{',
    '  "score": number,                    // 0-100 overall match',
    '  "summary": string,                  // one-paragraph tailored pitch, third person',
    '  "requirements": Array<{',
    '    "requirement": string,            // a key requirement from the JD',
    '    "status": "strong" | "partial" | "gap",',
    `    "evidence": string                // cite ${name}'s real experience/projects; for a gap, briefly note what's missing`,
    '  }>,',
    '  "gaps": string[]                    // honest list of missing or weak areas',
    '}',
    '',
    'Extract 4-8 of the most important requirements. Output JSON only — no markdown, no commentary.',
    '',
    'PROFILE DATA:',
    text,
  ].join('\n')
}
