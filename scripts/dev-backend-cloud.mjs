import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../backend/.env.cloud.local', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
if (
  process.env.NODE_ENV === 'production' ||
  process.env.FIREBASE_PROJECT_ID !== 'queimando-gordura-783e4' ||
  process.env.FIREBASE_MODE !== 'production' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.FIRESTORE_EMULATOR_HOST
)
  throw new Error('dev:cloud exige configuração explícita do Firebase Cloud DEV; consulte README.');
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/@nestjs/cli/bin/nest.js', import.meta.url)),
    'start',
    '--watch',
  ],
  {
    cwd: fileURLToPath(new URL('../backend', import.meta.url)),
    env: process.env,
    stdio: 'inherit',
  },
);
process.exit(result.status ?? 1);
