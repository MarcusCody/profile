import { Router } from 'express'
import { prisma } from './db'
import { requireAuth } from './auth/session'

export interface SectionConfig {
  path: string
  model: string
  fields: string[]
  arrayFields: string[]
}

export const sections: SectionConfig[] = [
  { path: 'skill-groups', model: 'skillGroup', fields: ['title'], arrayFields: ['skills'] },
  {
    path: 'experiences',
    model: 'experience',
    fields: ['company', 'role', 'period', 'location'],
    arrayFields: ['highlights'],
  },
  {
    path: 'projects',
    model: 'project',
    fields: ['name', 'description'],
    arrayFields: ['tags'],
  },
  {
    path: 'education',
    model: 'education',
    fields: ['institution', 'qualification', 'period', 'detail'],
    arrayFields: [],
  },
  {
    path: 'awards',
    model: 'award',
    fields: ['title', 'issuer', 'date', 'description'],
    arrayFields: [],
  },
]

function delegate(model: string): any {
  return (prisma as any)[model]
}

function toOutput(row: any, cfg: SectionConfig) {
  const out: any = { ...row }
  for (const f of cfg.arrayFields) out[f] = JSON.parse(row[f] ?? '[]')
  return out
}

function toRow(body: any, cfg: SectionConfig) {
  const data: any = {}
  for (const f of cfg.fields) if (body[f] !== undefined) data[f] = body[f]
  for (const f of cfg.arrayFields)
    if (body[f] !== undefined) data[f] = JSON.stringify(body[f] ?? [])
  return data
}

export async function getContent() {
  const [profile, skillGroups, experiences, projects, education, awards] =
    await Promise.all([
      prisma.profile.findUnique({ where: { id: 'singleton' } }),
      prisma.skillGroup.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.experience.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.project.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.education.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.award.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])

  return {
    profile,
    skillGroups: skillGroups.map((r) => ({ ...r, skills: JSON.parse(r.skills) })),
    experiences: experiences.map((r) => ({
      ...r,
      highlights: JSON.parse(r.highlights),
    })),
    projects: projects.map((r) => ({ ...r, tags: JSON.parse(r.tags) })),
    education,
    awards,
  }
}

export function sectionRouter(cfg: SectionConfig) {
  const r = Router()

  r.post('/', requireAuth, async (req, res) => {
    const max = await delegate(cfg.model).aggregate({ _max: { sortOrder: true } })
    const sortOrder = (max._max.sortOrder ?? -1) + 1
    const created = await delegate(cfg.model).create({
      data: { ...toRow(req.body, cfg), sortOrder },
    })
    res.status(201).json(toOutput(created, cfg))
  })

  r.put('/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id)
    const updated = await delegate(cfg.model).update({
      where: { id },
      data: toRow(req.body, cfg),
    })
    res.json(toOutput(updated, cfg))
  })

  r.delete('/:id', requireAuth, async (req, res) => {
    await delegate(cfg.model).delete({ where: { id: Number(req.params.id) } })
    res.status(204).end()
  })

  return r
}
