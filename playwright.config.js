import { defineConfig } from '@playwright/test';

const url = 'http://127.0.0.1:8765';

export default defineConfig({
  testDir: 'tests/e2e',
  // biome-ignore lint/style/useNamingConvention: Playwright's option name.
  use: { baseURL: url },
  webServer: {
    command: 'miniserve docs --index index.html --interfaces 127.0.0.1 --port 8765',
    url,
  },
});
