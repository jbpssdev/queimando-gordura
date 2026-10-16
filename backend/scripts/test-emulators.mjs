import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

const env = {
  ...process.env,
  FIREBASE_MODE: 'emulator',
  FIREBASE_PROJECT_ID: 'demo-queimando-gordura',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
};

const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
const portableJava = join(repoRoot, '.tools', 'java');

if (existsSync(portableJava)) {
  const directory = readdirSync(portableJava).find((entry) =>
    existsSync(join(portableJava, entry, 'bin', 'java.exe')),
  );
  if (directory) {
    env[pathKey] = `${join(portableJava, directory, 'bin')}${delimiter}${env[pathKey] ?? ''}`;
  }
}

const args = [
  join(repoRoot, 'node_modules/firebase-tools/lib/bin/firebase.js'),
  'emulators:exec',
  '--project',
  'demo-queimando-gordura',
  '--only',
  'auth,firestore',
  `npx vitest run test/emulator.integration-spec.ts --config ./vitest.config.e2e.ts`,
];

const result = spawnSync(process.execPath, args, {
  cwd: backendRoot,
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
