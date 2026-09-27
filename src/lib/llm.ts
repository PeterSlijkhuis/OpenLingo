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

/** Generate one image with an OpenAI-compatible images endpoint; returns a URL usable in <img>. */
export async function generateImage(
  settings: LlmSettings,
  model: string,
  prompt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${settings.baseUrl.replace(/\/+$/, '')}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      // Low quality is plenty for exam practice and keeps each picture at about a cent.
      ...(model.startsWith('gpt-image') ? { quality: 'low' } : { response_format: 'b64_json' }),
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Image request failed (${res.status}). ${detail.slice(0, 300)}`)
  }
  const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] }
  const img = data.data?.[0]
  if (img?.b64_json) return `data:image/png;base64,${img.b64_json}`
  if (img?.url) return img.url
  throw new Error('The image service returned no image.')
}

/** Read text aloud with an OpenAI-compatible speech endpoint; returns MP3 audio. */
export async function generateSpeech(
  settings: LlmSettings,
  model: string,
  voice: string,
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Blob> {
  const res = await fetchImpl(`${settings.baseUrl.replace(/\/+$/, '')}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      voice,
      input,
      response_format: 'mp3',
      // Only the gpt-4o speech models take instructions; older ones take a speed instead.
      ...(model.startsWith('gpt-4o')
        ? { instructions: 'Voice: a native Dutch speaker from the Netherlands in a real, everyday conversation. ' +
              'Tone: warm, natural and expressive, with lively intonation, never monotone. ' +
              'Pace: a little slower than normal, clear enough for a language learner.' }
        : { speed: 0.9 }),
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Speech request failed (${res.status}). ${detail.slice(0, 300)}`)
  }
  return res.blob()
}
