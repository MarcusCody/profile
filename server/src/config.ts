function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production')
  }
  return 'dev-insecure-secret'
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  jwtSecret: resolveJwtSecret(),
  allowedEmails: (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },
  llm: {
    // Which ChatProvider implementation to use. Swap models/vendors via env only.
    provider: process.env.LLM_PROVIDER ?? 'azure-openai',
    maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 800),
  },
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? '',
    apiKey: process.env.AZURE_OPENAI_API_KEY ?? '',
    // The Azure *deployment* name (acts as the model id for the SDK).
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21',
    // For reasoning models (e.g. gpt-oss): 'low' | 'medium' | 'high'. Empty =
    // omit the param (for non-reasoning models that would reject it).
    reasoningEffort: process.env.AZURE_OPENAI_REASONING_EFFORT ?? '',
  },
  get isHttps() {
    return this.appUrl.startsWith('https')
  },
}
