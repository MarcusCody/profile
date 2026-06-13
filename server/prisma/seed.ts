import { PrismaClient } from '@prisma/client'
import {
  profile,
  skillGroups,
  experiences,
  projects,
  education,
  awards,
} from '../../src/data/resume'

const prisma = new PrismaClient()

async function main() {
  await prisma.profile.upsert({
    where: { id: 'singleton' },
    update: { ...profile },
    create: { id: 'singleton', ...profile },
  })

  await prisma.skillGroup.deleteMany()
  for (let i = 0; i < skillGroups.length; i++) {
    const g = skillGroups[i]
    await prisma.skillGroup.create({
      data: { title: g.title, skills: JSON.stringify(g.skills), sortOrder: i },
    })
  }

  await prisma.experience.deleteMany()
  for (let i = 0; i < experiences.length; i++) {
    const e = experiences[i]
    await prisma.experience.create({
      data: {
        company: e.company,
        role: e.role,
        period: e.period,
        location: e.location,
        highlights: JSON.stringify(e.highlights),
        sortOrder: i,
      },
    })
  }

  await prisma.project.deleteMany()
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i]
    await prisma.project.create({
      data: {
        name: p.name,
        description: p.description,
        tags: JSON.stringify(p.tags),
        sortOrder: i,
      },
    })
  }

  await prisma.education.deleteMany()
  for (let i = 0; i < education.length; i++) {
    const ed = education[i]
    await prisma.education.create({
      data: {
        institution: ed.institution,
        qualification: ed.qualification,
        period: ed.period,
        detail: ed.detail ?? null,
        sortOrder: i,
      },
    })
  }

  await prisma.award.deleteMany()
  for (let i = 0; i < awards.length; i++) {
    const a = awards[i]
    await prisma.award.create({
      data: {
        title: a.title,
        issuer: a.issuer,
        date: a.date,
        description: a.description ?? null,
        sortOrder: i,
      },
    })
  }

  console.log('Seed complete.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
