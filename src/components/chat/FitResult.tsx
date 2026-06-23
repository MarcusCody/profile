import type { FitResult as FitResultData, FitRequirement } from '@/lib/api'
import { cn } from '@/lib/utils'

const statusStyles: Record<FitRequirement['status'], { label: string; className: string }> = {
  strong: {
    label: 'Strong',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  },
  partial: {
    label: 'Partial',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  },
  gap: {
    label: 'Gap',
    className: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  },
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-emerald-400'
  if (score >= 40) return 'bg-amber-400'
  return 'bg-rose-400'
}

export default function FitResult({ result }: { result: FitResultData }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-semibold">Match score</span>
          <span className="font-mono text-lg font-bold">{result.score}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', scoreColor(result.score))}
            style={{ width: `${result.score}%` }}
          />
        </div>
      </div>

      <p className="leading-relaxed text-muted-foreground">{result.summary}</p>

      <div className="flex flex-col gap-2">
        <span className="font-semibold">Requirements</span>
        <ul className="flex flex-col gap-2">
          {result.requirements.map((r, i) => {
            const s = statusStyles[r.status]
            return (
              <li key={i} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{r.requirement}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs',
                      s.className,
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.evidence}</p>
              </li>
            )
          })}
        </ul>
      </div>

      {result.gaps.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Gaps to note</span>
          <ul className="list-disc pl-5 text-xs text-muted-foreground">
            {result.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
