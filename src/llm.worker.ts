/// <reference lib="webworker" />
// Runs Gemma 4 in the browser with transformers.js (WebGPU). The model downloads once from the
// Hugging Face hub and is then cached by the browser.
import { pipeline, type TextGenerationPipeline } from '@huggingface/transformers'
import { BROWSER_MODEL } from './lib/providers'
import type { LocalRequest, LocalResponse } from './lib/localModel'

let generator: Promise<TextGenerationPipeline> | null = null

function post(msg: LocalResponse) {
  self.postMessage(msg)
}

async function load(): Promise<TextGenerationPipeline> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu || !(await gpu.requestAdapter().catch(() => null))) {
    throw new Error(
      'This browser cannot run the built-in coach (it needs WebGPU). Use a recent Chrome or Edge on a computer, ' +
        'or choose the free Google Gemini option in Settings.',
    )
  }
  // Loaded as a text model, so the image and audio parts of Gemma are not downloaded.
  return pipeline('text-generation', BROWSER_MODEL, {
    device: 'webgpu',
    dtype: 'q4f16',
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status === 'progress' && p.total) post({ type: 'progress', file: p.file ?? '', loaded: p.loaded ?? 0, total: p.total })
    },
  }) as Promise<TextGenerationPipeline>
}

self.onmessage = async (e: MessageEvent<LocalRequest>) => {
  const req = e.data
  try {
    if (!generator) {
      generator = load()
      generator.catch(() => (generator = null))
    }
    const gen = await generator
    if (req.type === 'load') return post({ type: 'result', id: req.id, text: '' })
    const out = (await gen(req.messages, { max_new_tokens: req.maxTokens, do_sample: false })) as {
      generated_text: { role: string; content: string }[]
    }[]
    post({ type: 'result', id: req.id, text: out[0].generated_text.at(-1)?.content ?? '' })
  } catch (err) {
    post({ type: 'error', id: req.id, message: err instanceof Error ? err.message : String(err) })
  }
}
