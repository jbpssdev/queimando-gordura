import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = {
  ...process.env,
  NODE_ENV: 'test',
  FIREBASE_MODE: 'emulator',
  FIREBASE_PROJECT_ID: 'demo-queimando-gordura',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
};
const commands = [
  {
    args: [
      'node_modules/vitest/vitest.mjs',
      'run',
      'test/emulator.integration-spec.ts',
      '--config',
      './vitest.config.e2e.ts',
    ],
    cwd: 'backend',
  },
  {
    args: [
      'node_modules/@playwright/test/cli.js',
      'test',
      '--config',
      'playwright.emulator.config.ts',
      '--grep-invert',
      'falha parcial',
    ],
    cwd: '.',
  },
  {
    args: [
      'node_modules/@playwright/test/cli.js',
      'test',
      '--config',
      'playwright.emulator.config.ts',
      '--grep',
      'falha parcial',
    ],
    cwd: '.',
    disabled: true,
  },
  { args: ['--test', 'firebase/firestore.rules.test.mjs'], cwd: '.' },
];
for (const command of commands) {
  const args = [...command.args];
  if (args[0].startsWith('node_modules/')) args[0] = join(root, args[0]);
  const result = spawnSync(process.execPath, args, {
    cwd: join(root, command.cwd),
    env: { ...env, QG_TEST_API_DISABLED: command.disabled ? '1' : '0' },
    stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
