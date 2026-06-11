import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SectionTitle from './SectionTitle'
import { experiences } from '../data/resume'

export default function Experience() {
  return (
    <section id="experience" className="container mx-auto max-w-5xl px-6 py-14">
      <SectionTitle>Experience</SectionTitle>
      <div className="relative flex flex-col gap-6 border-l-2 border-border pl-6">
        {experiences.map((job) => (
          <article key={job.company} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[31px] top-7 size-3 rounded-full bg-primary ring-4 ring-primary/20"
            />
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{job.role}</CardTitle>
                  <p className="mt-1 font-medium text-primary">{job.company}</p>
                </div>
                <div className="text-right font-mono text-xs text-muted-foreground max-sm:text-left">
                  <p>{job.period}</p>
                  <p>{job.location}</p>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm text-muted-foreground">
                  {job.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </article>
        ))}
      </div>
    </section>
  )
}
