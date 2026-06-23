import { AzureOpenAI } from 'openai'
import type {
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'
import { config } from '../../config'
import type { ChatMessage, ChatProvider, CompleteOptions } from '../provider'

/**
 * Builds the Azure OpenAI client lazily so that constructing the provider never
 * throws when credentials are absent (e.g. in tests). Missing config surfaces
 * only when a chat/fit-check request is actually made, where it is handled as a
 * clean error response.
 */
function getClient(): AzureOpenAI {
  const { endpoint, apiKey, apiVersion } = config.azureOpenAI
  if (!endpoint || !apiKey) {
    throw new Error(
      'Azure OpenAI is not configured (set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY)',
    )
  }
  return new AzureOpenAI({ endpoint, apiKey, apiVersion })
}

function toParams(
  system: string,
  messages: ChatMessage[],
): ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]
}

export function createAzureOpenAIProvider(): ChatProvider {
  const deployment = config.azureOpenAI.deployment
  const maxTokens = config.llm.maxTokens
  const reasoningEffort = config.azureOpenAI.reasoningEffort

  // Reasoning models (e.g. gpt-oss) spend tokens "thinking" before the visible
  // answer; only send the param when configured so non-reasoning models that
  // reject it keep working.
  const reasoning = reasoningEffort
    ? { reasoning_effort: reasoningEffort as 'low' | 'medium' | 'high' }
    : {}

  return {
    async *streamReply(system, messages) {
      const client = getClient()
      const stream = await client.chat.completions.create({
        model: deployment,
        max_tokens: maxTokens,
        stream: true,
        ...reasoning,
        messages: toParams(system, messages),
      })
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) yield delta
      }
    },

    async complete(system, messages, opts: CompleteOptions = {}) {
      const client = getClient()
      const res = await client.chat.completions.create({
        model: deployment,
        max_tokens: maxTokens,
        ...reasoning,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        messages: toParams(system, messages),
      })
      return res.choices[0]?.message?.content ?? ''
    },
  }
}
