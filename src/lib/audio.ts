/** Whisper expects 16 kHz mono PCM. */
export const SAMPLE_RATE = 16000

/** Decode a recorded blob (webm/ogg/mp4) into 16 kHz mono samples. */
export async function blobToPcm(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
    return toMono(buffer)
  } finally {
    void ctx.close()
  }
}

export function toMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice()
  const out = new Float32Array(buffer.length)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) out[i] += data[i] / buffer.numberOfChannels
  }
  return out
}

export interface Recording {
  stop: () => Promise<{ blob: Blob; seconds: number }>
  cancel: () => void
}

/** Start recording from the microphone. */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []
  const started = performance.now()
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  recorder.start()
  const release = () => stream.getTracks().forEach((t) => t.stop())
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          release()
          resolve({
            blob: new Blob(chunks, { type: recorder.mimeType }),
            seconds: (performance.now() - started) / 1000,
          })
        }
        recorder.stop()
      }),
    cancel: () => {
      recorder.onstop = release
      if (recorder.state !== 'inactive') recorder.stop()
      else release()
    },
  }
}
