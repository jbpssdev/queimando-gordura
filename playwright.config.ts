import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://localhost:4200', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npm run start:prod --workspace backend',
      url: 'http://127.0.0.1:3100/api/v1/health',
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        PORT: '3100',
        CORS_ORIGINS: 'http://localhost:4200',
        FIREBASE_MODE: 'disabled',
      },
    },
    {
      command: 'npm run dev:frontend',
      url: 'http://localhost:4200',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
