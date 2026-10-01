import type { ChatMessage } from './llm'

export type LocalRequest =
  | { type: 'load'; id: number }
  | { type: 'generate'; id: number; messages: ChatMessage[]; maxTokens: number }

export type LocalResponse =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id: number; message: string }

type Listener = (fraction: number | null) => void

/** Promise-based wrapper around the in-browser Gemma worker, with download progress for the UI. */
class LocalModel {
  private worker: Worker | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>()
  private files = new Map<string, { loaded: number; total: number }>()
  private listeners = new Set<Listener>()

  /** Called with 0..1 while downloading and null when done. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(v: number | null) {
    for (const fn of this.listeners) fn(v)
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../llm.worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = (e: MessageEvent<LocalResponse>) => this.handle(e.data)
    }
    return this.worker
  }

  private handle(msg: LocalResponse) {
    if (msg.type === 'progress') {
      this.files.set(msg.file, { loaded: msg.loaded, total: msg.total })
      let loaded = 0
      let total = 0
      for (const f of this.files.values()) {
        loaded += f.loaded
        total += f.total
      }
      this.emit(total ? loaded / total : 0)
      return
    }
    this.emit(null)
    const p = this.pending.get(msg.id)
    if (!p) return
    this.pending.delete(msg.id)
    if (msg.type === 'error') p.reject(new Error(msg.message))
    else p.resolve(msg.text)
  }

  private send(req: LocalRequest extends infer R ? (R extends unknown ? Omit<R, 'id'> : never) : never): Promise<string> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.getWorker().postMessage({ ...req, id })
    })
  }

  load(): Promise<string> {
    return this.send({ type: 'load' })
  }

  generate(messages: ChatMessage[], maxTokens = 3000): Promise<string> {
    return this.send({ type: 'generate', messages, maxTokens })
  }
}

export const localModel = new LocalModel()
