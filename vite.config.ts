import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Relative base so the build works at https://<user>.github.io/<repo>/ without configuration.
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  test: { environment: 'node' },
})
