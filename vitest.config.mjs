import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Date formatting in tests must not depend on the machine's time zone.
    env: { TZ: 'UTC' },
  },
});
