/// <reference lib="webworker" />
// Runs Whisper in the browser with transformers.js. Models download once from the
// Hugging Face hub and are then cached by the browser.
import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import { MODELS, type WhisperModel, type WorkerRequest, type WorkerResponse } from './lib/transcriber'

let current: { model: WhisperModel; asr: Promise<AutomaticSpeechRecognitionPipeline> } | null = null

function post(msg: WorkerResponse) {
  self.postMessage(msg)
}

async function hasWebGpu(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    return !!(gpu && (await gpu.requestAdapter()))
  } catch {
    return false
  }
}

async function load(model: WhisperModel): Promise<AutomaticSpeechRecognitionPipeline> {
  if (current?.model === model) return current.asr
  const spec = MODELS[model]
  const webgpu = await hasWebGpu()
  if (spec.webgpuOnly && !webgpu) {
    throw new Error(`${spec.label} needs a browser with WebGPU. Choose a smaller model in Settings.`)
  }
  const asr = pipeline('automatic-speech-recognition', spec.repo, {
    device: webgpu ? 'webgpu' : 'wasm',
    dtype: webgpu ? spec.dtypeGpu : spec.dtypeCpu,
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status === 'progress' && p.total) {
        post({ type: 'progress', file: p.file ?? '', loaded: p.loaded ?? 0, total: p.total })
      }
    },
  }) as Promise<AutomaticSpeechRecognitionPipeline>
  current = { model, asr }
  asr.catch(() => {
    current = null
  })
  return asr
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data
  try {
    const asr = await load(req.model)
    if (req.type === 'load') {
      post({ type: 'ready', id: req.id })
      return
    }
    const out = await asr(req.audio, {
      language: 'dutch',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    })
    const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text
    post({ type: 'result', id: req.id, text: text.trim() })
  } catch (err) {
    post({ type: 'error', id: req.id, message: err instanceof Error ? err.message : String(err) })
  }
}
