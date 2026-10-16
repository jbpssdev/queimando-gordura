import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const firebaseDir = fileURLToPath(new URL('./', import.meta.url));
const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const args = process.argv.slice(2);
let targetProject = process.env.FIREBASE_PROJECT_ID ?? '';

const projectArgIdx = args.indexOf('--project');
if (projectArgIdx !== -1 && args[projectArgIdx + 1]) {
  targetProject = args[projectArgIdx + 1];
}

console.log('--- Deploy Seguro de Regras do Firestore (Ambiente de Desenvolvimento) ---');

if (!targetProject || targetProject.startsWith('demo-')) {
  console.log('[AVISO] Nenhum projeto Cloud de desenvolvimento foi informado.');
  console.log('');
  console.log('Uso: node firebase/deploy-rules-dev.mjs --project <id-projeto-dev>');
  console.log('Exemplo: node firebase/deploy-rules-dev.mjs --project queimando-gordura-dev');
  console.log('');
  console.log('O script bloqueia preventivamente o deploy para projetos contendo "prod" no identificador.');
  process.exit(0);
}

if (targetProject.toLowerCase().includes('prod')) {
  console.error(`[BLOQUEIO DE SEGURANÇA] O projeto "${targetProject}" contém "prod".`);
  console.error('Este script destina-se exclusivamente a ambientes de desenvolvimento.');
  process.exit(1);
}

const rulesContent = readFileSync(join(firebaseDir, 'firestore.rules'), 'utf8');
console.log(`[ALVO] Projeto de desenvolvimento: ${targetProject}`);
console.log('[REGRAS APLICADAS]');
console.log(rulesContent);

console.log('[INFO] Executando deploy via Firebase CLI...');
const firebaseBin = join(repoRoot, 'node_modules/firebase-tools/lib/bin/firebase.js');

const result = spawnSync(
  process.execPath,
  [firebaseBin, 'deploy', '--only', 'firestore:rules', '--project', targetProject],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

if (result.status === 0) {
  console.log(`[SUCESSO] Regras restritivas implantadas no projeto ${targetProject}.`);
}

process.exit(result.status ?? 1);
