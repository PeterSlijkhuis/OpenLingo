import type { Skill } from '../lib/types'

// Simple line icons, drawn on a 24 × 24 grid.
const PATHS: Record<Skill | 'progress' | 'settings', string> = {
  spreken: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11a7 7 0 0 0 14 0 M12 18v3',
  schrijven: 'M4 20h4L19 9l-4-4L4 16v4z M13.5 6.5l4 4',
  lezen: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z',
  luisteren: 'M4 15v-3a8 8 0 0 1 16 0v3 M4 15h3v5H5a1 1 0 0 1-1-1z M20 15h-3v5h2a1 1 0 0 0 1-1z',
  knm: 'M3 21h18 M4 10h16 M12 3l8 5H4z M6 10v8 M10 10v8 M14 10v8 M18 10v8',
  progress: 'M4 20V10 M10 20V4 M16 20v-7 M3 20h18',
  settings: 'M4 7h10 M18 7h2 M4 17h4 M12 17h8 M16 5v4 M10 15v4',
}

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
