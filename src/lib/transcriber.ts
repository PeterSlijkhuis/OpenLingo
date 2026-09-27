export type WhisperModel = 'base' | 'small' | 'turbo'

type Dtype = Record<string, 'q4' | 'q8' | 'fp16' | 'fp32' | 'q4f16'>

export const MODELS: Record<
  WhisperModel,
  { repo: string; label: string; size: string; webgpuOnly: boolean; dtypeCpu: Dtype; dtypeGpu: Dtype }
> = {
  base: {
    repo: 'onnx-community/whisper-base',
    label: 'Whisper base',
    size: 'about 80 MB, fast, less accurate',
    webgpuOnly: false,
    dtypeCpu: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    dtypeGpu: { encoder_model: 'fp16', decoder_model_merged: 'q8' },
  },
  small: {
    repo: 'onnx-community/whisper-small',
    label: 'Whisper small',
    size: 'about 250 MB, good balance',
    webgpuOnly: false,
    dtypeCpu: { encoder_model: 'q8', decoder_model_merged: 'q8' },
    dtypeGpu: { encoder_model: 'fp16', decoder_model_merged: 'q8' },
  },
  turbo: {
    repo: 'onnx-community/whisper-large-v3-turbo',
    label: 'Whisper large-v3 turbo',
    size: 'about 560 MB, most accurate, needs WebGPU',
    webgpuOnly: true,
    dtypeCpu: { encoder_model: 'q4f16', decoder_model_merged: 'q4f16' },
    dtypeGpu: { encoder_model: 'q4f16', decoder_model_merged: 'q4f16' },
  },
}

export type WorkerRequest =
  | { type: 'load'; id: number; model: WhisperModel }
  | { type: 'transcribe'; id: number; model: WhisperModel; audio: Float32Array }

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

export type WorkerResponse =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { type: 'ready'; id: number }
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id: number; message: string }

export type ProgressFn = (fraction: number) => void

/** Promise-based wrapper around the Whisper web worker. */
export class Transcriber {
  private worker: Worker | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>()
  private files = new Map<string, { loaded: number; total: number }>()
  onProgress: ProgressFn | null = null

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../whisper.worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.handle(e.data)
    }
    return this.worker
  }

  private handle(msg: WorkerResponse) {
    if (msg.type === 'progress') {
      this.files.set(msg.file, { loaded: msg.loaded, total: msg.total })
      let loaded = 0
      let total = 0
      for (const f of this.files.values()) {
        loaded += f.loaded
        total += f.total
      }
      this.onProgress?.(total ? loaded / total : 0)
      return
    }
    const p = this.pending.get(msg.id)
    if (!p) return
    this.pending.delete(msg.id)
    if (msg.type === 'error') p.reject(new Error(msg.message))
    else p.resolve(msg.type === 'result' ? msg.text : '')
  }

  private send(req: DistributiveOmit<WorkerRequest, 'id'>, transfer: Transferable[] = []): Promise<string> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.getWorker().postMessage({ ...req, id }, transfer)
    })
  }

  /** Download (first time) and initialise the model. */
  async load(model: WhisperModel): Promise<void> {
    this.files.clear()
    await this.send({ type: 'load', model })
  }

  transcribe(model: WhisperModel, audio: Float32Array): Promise<string> {
    return this.send({ type: 'transcribe', model, audio }, [audio.buffer])
  }
}

export const transcriber = new Transcriber()
