import { defineConfig } from 'vitest/config'

// Fixed zone with DST so day/streak maths is tested across clock changes.
process.env.TZ = 'Europe/Madrid'

// Separate from vite.config.ts: the app plugins (Start, Nitro) are not needed here.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ['src/**/*.test.ts', 'worker/src/**/*.test.ts'] },
})
