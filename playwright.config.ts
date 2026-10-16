import { defineConfig } from '@playwright/test';
const port = Number(process.env['QG_FRONTEND_PORT'] ?? 4203);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Porta de teste inválida.');

export default defineConfig({
  testDir: './scripts/smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: `http://localhost:${port}`, browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npm run start:prod --workspace backend',
      url: 'http://127.0.0.1:3105/api/v1/health',
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        PORT: '3105',
        CORS_ORIGINS: `http://localhost:${port}`,
        FIREBASE_MODE: 'disabled',
      },
    },
    {
      command: `npm run start --workspace frontend -- --port ${port} --proxy-config proxy.integration.conf.json`,
      url: `http://localhost:${port}`,
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
