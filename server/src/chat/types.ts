/** A single requirement extracted from a job description, mapped to evidence. */
export interface FitRequirement {
  requirement: string
  status: 'strong' | 'partial' | 'gap'
  evidence: string
}

/** Structured result of a job-description fit check. */
export interface FitResult {
  /** Overall match, 0-100. */
  score: number
  /** One-paragraph tailored pitch. */
  summary: string
  requirements: FitRequirement[]
  /** Honest missing/weak areas. */
  gaps: string[]
}
