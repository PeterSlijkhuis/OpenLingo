import { describe, expect, it } from 'vitest'
import { buildFeedbackPrompt, buildTaskPrompt, generateTask, parseTask, pictureKind } from '../src/lib/coach'

const settings = { baseUrl: 'https://api.example.com/v1', apiKey: 'k', model: 'm' }
const adaptation = { topic: 'wonen', focus: 'samenhang', difficulty: 'standard' } as const
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300"/></svg>'
const story = {
  situation: 'U ziet vier plaatjes.',
  question: 'Vertel wat er gebeurt.',
  contentPoints: ['alle plaatjes', 'de goede volgorde'],
  pictures: [1, 2, 3, 4].map((n) => ({ description: `plaatje ${n}`, svg: `Here: ${svg} done` })),
}

/** Answers chat calls with `chat` and image calls with a tiny base64 image (or an error). */
function fakeFetch(chat: unknown, imageStatus = 200) {
  const urls: string[] = []
  const impl = (async (url: string) => {
    urls.push(url)
    if (url.endsWith('/images/generations')) {
      return new Response(JSON.stringify({ data: [{ b64_json: 'QUJD' }] }), { status: imageStatus })
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(chat) } }] }))
  }) as unknown as typeof fetch
  return { impl, urls }
}

describe('picture tasks', () => {
  it('asks for the right number of pictures', () => {
    const [system] = buildTaskPrompt('A2', 'medium', adaptation, [], 'story')
    expect(system.content).toContain('exactly 4 items')
    expect(system.content).toContain('must not describe what is in the pictures')
  })

  it('times a picture story as the long talk only where the exam has one', () => {
    expect(pictureKind('B2', 'story')).toBe('long')
    expect(pictureKind('B1', 'story')).toBe('medium')
    expect(pictureKind('B2', 'describe')).toBe('medium')
  })

  it('turns generated SVG into image URLs and rejects missing pictures', () => {
    const t = parseTask(story, 'A2', 'medium', 'wonen', 'x', 'story')
    expect(t.pictures).toHaveLength(4)
    expect(t.pictures![0].src.startsWith('data:image/svg+xml')).toBe(true)
    expect(decodeURIComponent(t.pictures![0].src)).not.toContain('Here:')
    expect(() => parseTask({ ...story, pictures: story.pictures.slice(0, 3) }, 'A2', 'medium', 'wonen', 'x', 'story')).toThrow('pictures')
  })

  it('gives the examiner the picture descriptions in order', () => {
    const t = parseTask(story, 'A2', 'medium', 'wonen', 'x', 'story')
    const [, user] = buildFeedbackPrompt(t, { transcript: 'eerst', seconds: 30, allowedSeconds: 60 }, 'en')
    expect(user.content).toContain('1. plaatje 1\n2. plaatje 2')
  })

  it('uses AI images when chosen and falls back to drawings when they fail', async () => {
    const ok = fakeFetch(story)
    const t = await generateTask({ ...settings, provider: 'openai' as const, pictureSource: 'ai', imageModel: 'gpt-image-1' }, 'A2', 'medium', adaptation, [], ok.impl, 'story')
    expect(ok.urls.filter((u) => u.endsWith('/images/generations'))).toHaveLength(4)
    expect(t.pictures![0].src).toBe('data:image/png;base64,QUJD')

    const bad = fakeFetch(story, 400)
    const f = await generateTask({ ...settings, provider: 'openai' as const, pictureSource: 'ai' }, 'A2', 'medium', adaptation, [], bad.impl, 'story')
    expect(f.pictures![0].src.startsWith('data:image/svg+xml')).toBe(true)
    expect(f.pictureNote).toContain('showing drawings')

    const free = fakeFetch(story)
    await generateTask({ ...settings, pictureSource: 'drawings' }, 'A2', 'medium', adaptation, [], free.impl, 'story')
    expect(free.urls).toHaveLength(1)
  })
})
