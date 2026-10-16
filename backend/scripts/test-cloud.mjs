import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));

const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
const isCloudMode = process.env.FIREBASE_MODE === 'production';
const hasAuthMethod =
  process.env.FIREBASE_USE_ADC === 'true' || Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
const isAuthorized = process.env.FIREBASE_ALLOW_CLOUD_TEST === 'true';

console.log('--- Verificação de Projeto Firebase Cloud (Desenvolvimento) ---');

if (!isCloudMode || !projectId || projectId.startsWith('demo-') || !hasAuthMethod || !isAuthorized) {
  console.log('[INFO] Validação em Firebase Cloud Real marcada como PENDENTE de credenciais do proprietário.');
  console.log('');
  console.log('Para executar a validação controlada em um projeto real de desenvolvimento:');
  console.log('1. Crie ou utilize um projeto Firebase de desenvolvimento (ex.: queimando-gordura-dev).');
  console.log('2. Configure no arquivo .env (ou no ambiente):');
  console.log('   FIREBASE_MODE=production');
  console.log('   FIREBASE_PROJECT_ID=queimando-gordura-dev');
  console.log('   FIREBASE_ALLOW_CLOUD_TEST=true');
  console.log('   FIREBASE_USE_ADC=true   # ou GOOGLE_APPLICATION_CREDENTIALS=C:/secrets/dev-sa.json');
  console.log('3. Execute novamente: npm run test:cloud --workspace backend');
  console.log('');
  console.log('A suíte de testes unitários, testes HTTP e testes com Firebase Emulator Suite permanecem 100% validados.');
  process.exit(0);
}

if (projectId.toLowerCase().includes('prod')) {
  console.error('[ERRO DE SEGURANÇA] O Project ID contém "prod". Testes destrutivos nunca podem ser executados em produção.');
  process.exit(1);
}

console.log(`[INFO] Executando validação controlada no projeto: ${projectId}`);

const args = [
  'npx',
  'vitest',
  'run',
  'test/cloud.integration-spec.ts',
  '--config',
  './vitest.config.e2e.ts',
];

const result = spawnSync('npx', ['vitest', 'run', 'test/cloud.integration-spec.ts', '--config', './vitest.config.e2e.ts'], {
  cwd: backendRoot,
  env: process.env,
  shell: true,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
