import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { assertCloudTestEnvironment } from './backend/scripts/cloud-safety.mjs';

if (existsSync('backend/.env.cloud.local')) process.loadEnvFile('backend/.env.cloud.local');
assertCloudTestEnvironment();
const port = Number(process.env['QG_FRONTEND_PORT'] ?? 4202);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Porta inválida.');

export default defineConfig({
  testDir: './scripts/cloud',
  workers: 1,
  retries: 0,
  timeout: 180000,
  use: { baseURL: `http://localhost:${port}`, browserName: 'chromium', trace: 'off' },
  webServer: [
    {
      command: 'npm run start:prod --workspace backend',
      url: 'http://127.0.0.1:3100/api/v1/health',
      reuseExistingServer: false,
      timeout: 30000,
      env: { ...process.env, NODE_ENV: 'test', CORS_ORIGINS: `http://localhost:${port}` },
    },
    {
      command: `npm run start --workspace frontend -- --configuration cloud-development --port ${port}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        PORT: String(port),
        GOOGLE_APPLICATION_CREDENTIALS: '',
        FIREBASE_ALLOW_CLOUD_TEST: '',
      },
    },
  ],
});
