import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/@nestjs/cli/bin/nest.js', import.meta.url)),
    'start',
    '--watch',
  ],
  {
    cwd: fileURLToPath(new URL('../backend/', import.meta.url)),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      FIREBASE_MODE: 'emulator',
      FIREBASE_PROJECT_ID: 'demo-queimando-gordura',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    },
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
