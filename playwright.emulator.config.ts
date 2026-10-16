import { defineConfig } from '@playwright/test';

const port = Number(process.env['QG_FRONTEND_PORT'] ?? 4201);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Porta de teste inválida.');
const disabled = process.env['QG_TEST_API_DISABLED'] === '1';

export default defineConfig({
  testDir: './scripts/integration',
  workers: 1,
  retries: 0,
  timeout: 45000,
  // Traces/HAR conteriam tokens e senhas temporárias. Capturas visuais são explícitas.
  use: { baseURL: `http://localhost:${port}`, browserName: 'chromium', trace: 'off' },
  webServer: [
    {
      command: 'npm run start:prod --workspace backend',
      url: 'http://127.0.0.1:3100/api/v1/health',
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        PORT: '3100',
        CORS_ORIGINS: `http://localhost:${port}`,
        FIREBASE_MODE: disabled ? 'disabled' : 'emulator',
        FIREBASE_PROJECT_ID: 'demo-queimando-gordura',
        FIREBASE_AUTH_EMULATOR_HOST: disabled ? '' : '127.0.0.1:9099',
        FIRESTORE_EMULATOR_HOST: disabled ? '' : '127.0.0.1:8080',
      },
    },
    {
      command: `npm run start --workspace frontend -- --configuration emulator --port ${port}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
