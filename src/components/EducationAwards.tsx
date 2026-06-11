import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import SectionTitle from './SectionTitle'
import { education, awards } from '../data/resume'

export default function EducationAwards() {
  return (
    <section id="education" className="container mx-auto max-w-5xl px-6 py-14">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <SectionTitle>Education</SectionTitle>
          <div className="flex flex-col gap-4">
            {education.map((entry) => (
              <Card key={entry.qualification}>
                <CardHeader>
                  <CardTitle className="text-base">{entry.qualification}</CardTitle>
                  <CardDescription>{entry.institution}</CardDescription>
                </CardHeader>
                <CardContent className="pt-3">
                  <p className="font-mono text-xs text-muted-foreground">
                    {entry.period}
                    {entry.detail ? ` · ${entry.detail}` : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle>Awards</SectionTitle>
          <div className="flex flex-col gap-4">
            {awards.map((award) => (
              <Card key={award.title}>
                <CardHeader>
                  <CardTitle className="text-base">{award.title}</CardTitle>
                  <p className="font-mono text-xs text-muted-foreground">
                    {award.issuer} · {award.date}
                  </p>
                </CardHeader>
                <CardContent className="pt-3">
                  {award.description && (
                    <CardDescription>{award.description}</CardDescription>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
