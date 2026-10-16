import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertCloudTestEnvironment } from './cloud-safety.mjs';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const envPath = fileURLToPath(new URL('../.env.cloud.local', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
assertCloudTestEnvironment();
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL('../../node_modules/vitest/vitest.mjs', import.meta.url)),
    'run',
    'test/cloud.integration-spec.ts',
    '--config',
    './vitest.config.e2e.ts',
  ],
  { cwd: backendRoot, env: { ...process.env, NODE_ENV: 'test' }, stdio: 'inherit' },
);
process.exit(result.status ?? 1);
