import { Button } from '@/components/ui/button'
import { GitHubIcon } from '@/components/icons'

export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Profile Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage your resume content.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button asChild>
          <a href="/auth/github">
            <GitHubIcon aria-hidden="true" />
            Continue with GitHub
          </a>
        </Button>
        <Button asChild variant="secondary">
          <a href="/auth/google">Continue with Google</a>
        </Button>
      </div>
    </div>
  )
}
