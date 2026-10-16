import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
// Java portátil opcional; nunca altera o PATH global do Windows.
const portable = join(root, '.tools', 'java');
if (existsSync(portable)) {
  const directory = readdirSync(portable).find((entry) =>
    existsSync(join(portable, entry, 'bin', 'java.exe')),
  );
  if (directory)
    env[pathKey] = `${join(portable, directory, 'bin')}${delimiter}${env[pathKey] ?? ''}`;
}
const java = spawnSync('java', ['-version'], { env, encoding: 'utf8' });
if (java.error || java.status !== 0) {
  console.error(
    'Emuladores Firestore exigem Java 21+. Configure JAVA_HOME/PATH ou use Java portátil em .tools/java/<jdk>/bin. Frontend e backend não dependem de Java.',
  );
  process.exit(1);
}
const testing = process.argv.includes('--test');
const integrating = process.argv.includes('--integration');
const args = [
  join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'),
  testing || integrating ? 'emulators:exec' : 'emulators:start',
  '--project',
  'demo-queimando-gordura',
  '--only',
  'auth,firestore',
];
if (testing) args.push(`"${process.execPath}" --test firebase/firestore.rules.test.mjs`);
if (integrating) args.push(`"${process.execPath}" scripts/run-integration.mjs`);
const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
