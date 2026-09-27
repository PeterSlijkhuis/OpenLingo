import { describe, expect, it } from 'vitest'
import { parseQuiz } from '../src/lib/coach'
import { generateSpeech } from '../src/lib/llm'
import { castVoices, scriptTurns } from '../src/lib/speech'

describe('listening voices', () => {
  it('casts voices by gender, and different voices for two speakers of the same gender', () => {
    const turns = scriptTurns('Anna: Hoi.\nKees: Dag.\nPiet: Ja.\nAnna: Oké.')
    expect(castVoices(turns, { Anna: 'female', Kees: 'male', Piet: 'male' })).toEqual({ Anna: 'nova', Kees: 'onyx', Piet: 'ash' })
    // Unknown genders alternate, starting female; a narrator line has speaker ''.
    expect(castVoices(scriptTurns('Welkom.\nX: Hallo.'))).toEqual({ '': 'nova', X: 'onyx' })
  })

  it('keeps only valid speaker genders from the generated exercise', () => {
    const raw = {
      title: 'T', text: 'Anna: Hoi.', speakers: { Anna: 'female', Bob: 'robot' },
      questions: [{ question: 'Q', options: ['a', 'b'], answer: 0, explanation: '' }],
    }
    expect(parseQuiz(raw, 'luisteren', 'B1', 'x', 'q').speakers).toEqual({ Anna: 'female' })
  })

  it('calls the speech endpoint with the voice and Dutch instructions', async () => {
    let body: Record<string, unknown> = {}
    let url = ''
    const impl = (async (u: string, init: RequestInit) => {
      url = u
      body = JSON.parse(String(init.body))
      return new Response(new Uint8Array([1, 2, 3]))
    }) as unknown as typeof fetch
    const blob = await generateSpeech({ baseUrl: 'https://api.example.com/v1/', apiKey: 'k', model: 'm' }, 'gpt-4o-mini-tts', 'nova', 'Hoi', impl)
    expect(url).toBe('https://api.example.com/v1/audio/speech')
    expect(body).toMatchObject({ model: 'gpt-4o-mini-tts', voice: 'nova', input: 'Hoi' })
    expect(String(body.instructions)).toContain('Dutch')
    expect(blob.size).toBe(3)
  })
})
