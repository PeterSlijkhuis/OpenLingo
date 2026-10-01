import { beforeEach, describe, expect, it } from 'vitest'
import { chatJson, parseJsonReply } from '../src/lib/llm'
import { needsKey, PROVIDERS } from '../src/lib/providers'
import { aiVoices, loadSettings } from '../src/lib/storage'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  } as Storage
})

describe('providers', () => {
  it('starts new users on the free in-browser coach, which needs no key', () => {
    const s = loadSettings()
    expect(s.provider).toBe('browser')
    expect(needsKey(s)).toBe(false)
    expect(aiVoices(s)).toBe(false)
  })

  it('keeps people who already saved an OpenAI key on OpenAI', () => {
    store.set('openlingo.settings', JSON.stringify({ apiKey: 'sk-1', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }))
    const s = loadSettings()
    expect(s.provider).toBe('openai')
    expect(aiVoices(s)).toBe(true)
  })

  it('needs a key for online services except a custom server', () => {
    expect(needsKey({ provider: 'gemini', apiKey: '' })).toBe(true)
    expect(needsKey({ provider: 'gemini', apiKey: 'k' })).toBe(false)
    expect(needsKey({ provider: 'custom', apiKey: '' })).toBe(false)
  })

  it('reads JSON wrapped in a code fence or prose', () => {
    expect(parseJsonReply('```json\n{"a": 1}\n```')).toEqual({ a: 1 })
    expect(parseJsonReply('Hier is het: {"a": {"b": 2}} Succes!')).toEqual({ a: { b: 2 } })
    expect(() => parseJsonReply('geen json')).toThrow('valid JSON')
  })

  it('uses JSON mode for Gemini but not for the Hugging Face router', async () => {
    const bodies: Record<string, unknown>[] = []
    const impl = (async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)))
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }))
    }) as unknown as typeof fetch
    const msgs = [{ role: 'user' as const, content: 'x' }]
    await chatJson({ provider: 'gemini', ...PROVIDERS.gemini, apiKey: 'k' }, msgs, impl)
    await chatJson({ provider: 'huggingface', ...PROVIDERS.huggingface, apiKey: 'k' }, msgs, impl)
    expect(bodies[0].response_format).toEqual({ type: 'json_object' })
    expect(bodies[0].model).toBe('gemini-flash-latest')
    expect(bodies[1].response_format).toBeUndefined()
  })
})
