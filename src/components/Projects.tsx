import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SectionTitle from './SectionTitle'
import { projects } from '../data/resume'

export default function Projects() {
  return (
    <section id="projects" className="container mx-auto max-w-5xl px-6 py-14">
      <SectionTitle>Selected Projects</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.name} className="flex flex-col">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-4">
              <ul className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <li key={tag}>
                    <Badge>{tag}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
