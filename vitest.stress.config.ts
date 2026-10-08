import { configDefaults, defineConfig } from 'vitest/config'

import baseConfig from './vitest.config.ts'

// `npm run test:stress` — load and render-stress tests (*.stress.test.ts(x)).
// Kept out of `npm test` because they take longer and measure timings, which
// a busy machine can skew; same plugins and setup as the unit suite.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/**/*.stress.test.{ts,tsx}'],
    exclude: configDefaults.exclude,
    testTimeout: 60_000,
    // One file at a time, so each one's timings aren't competing for CPU.
    fileParallelism: false,
  },
})
