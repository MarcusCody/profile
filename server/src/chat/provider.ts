import { config } from '../config'
import { createAzureOpenAIProvider } from './providers/azureOpenAI'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface CompleteOptions {
  /** Ask the model for a strict JSON object response (used by the fit check). */
  json?: boolean
}

/**
 * Vendor-agnostic LLM interface. Swapping models/providers is a config change
 * plus a new implementation file — nothing else in the app references a vendor
 * SDK directly.
 */
export interface ChatProvider {
  /** Streams a free-form reply token-by-token (powers the chat tab). */
  streamReply(system: string, messages: ChatMessage[]): AsyncIterable<string>
  /** Returns a single completion (powers the structured fit check). */
  complete(
    system: string,
    messages: ChatMessage[],
    opts?: CompleteOptions,
  ): Promise<string>
}

/**
 * Resolves the configured provider. Construction is cheap and never reaches out
 * to a vendor — credential checks happen lazily when a method is first called,
 * so this is safe to call at app startup (and in tests) without LLM env vars.
 */
export function getChatProvider(): ChatProvider {
  switch (config.llm.provider) {
    case 'azure-openai':
      return createAzureOpenAIProvider()
    // Future drop-ins (no other code changes needed):
    // case 'gemini': return createGeminiProvider()
    // case 'openai': return createOpenAIProvider()
    default:
      throw new Error(`Unknown LLM provider: ${config.llm.provider}`)
  }
}
