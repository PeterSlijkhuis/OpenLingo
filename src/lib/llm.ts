export interface LlmSettings {
  /** OpenAI-compatible API base, e.g. https://api.openai.com/v1 */
  baseUrl: string
  apiKey: string
  model: string
}

export type ChatMessage = { role: 'system' | 'user'; content: string }

/** Call an OpenAI-compatible chat completions endpoint and parse its JSON reply. */
export async function chatJson(
  settings: LlmSettings,
  messages: ChatMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  if (!settings.apiKey) throw new Error('No API key set. Add one in Settings.')
  const res = await fetchImpl(`${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Language model request failed (${res.status}). ${detail.slice(0, 300)}`)
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('The language model returned an empty reply.')
  try {
    return JSON.parse(content)
  } catch {
    throw new Error('The language model did not return valid JSON.')
  }
}
