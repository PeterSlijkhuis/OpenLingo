/** Where exercises and feedback come from. */
export type Provider = 'browser' | 'gemini' | 'huggingface' | 'openai' | 'custom'

export interface ProviderInfo {
  label: string
  /** One line on cost and trade-offs, shown in Settings. */
  note: string
  baseUrl: string
  model: string
  /** Where to get a key; absent when no key is needed. */
  keyUrl?: string
  free: boolean
}

export const BROWSER_MODEL = 'onnx-community/gemma-4-E2B-it-ONNX'

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  browser: {
    label: 'Free, in your browser',
    note:
      'Gemma 4 runs on your own device: no account, no key, nothing leaves your computer. ' +
      'Downloads about 3 GB once and needs a recent desktop browser with WebGPU. Feedback is simpler than with the online options.',
    baseUrl: '',
    model: BROWSER_MODEL,
    free: true,
  },
  gemini: {
    label: 'Free, with Google Gemini',
    note:
      'Best free quality. Needs a free API key from Google AI Studio (no credit card). ' +
      'Free-tier requests may be used by Google to improve its products, and there is a daily limit.',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-flash-latest',
    keyUrl: 'https://aistudio.google.com/apikey',
    free: true,
  },
  huggingface: {
    label: 'Hugging Face',
    note:
      'Open models through a free Hugging Face token. The free monthly credit is small (about $0.10), ' +
      'enough for a few sessions; after that it is pay-as-you-go.',
    baseUrl: 'https://router.huggingface.co/v1',
    model: 'openai/gpt-oss-120b',
    keyUrl: 'https://huggingface.co/settings/tokens',
    free: false,
  },
  openai: {
    label: 'OpenAI',
    note: 'Paid, a few cents per session. The only option with natural AI voices and AI images.',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    free: false,
  },
  custom: {
    label: 'Other (OpenAI-compatible)',
    note: 'Any service with an OpenAI-compatible chat API, such as a local Ollama or LM Studio server.',
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma3',
    free: false,
  },
}

/** True when the coach cannot work yet because a key is missing. */
export function needsKey(s: { provider: Provider; apiKey: string }): boolean {
  return s.provider !== 'browser' && s.provider !== 'custom' && !s.apiKey
}
