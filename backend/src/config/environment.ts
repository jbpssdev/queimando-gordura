import { isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';

export function validateEnvironment(input: Record<string, unknown>) {
  const nodeEnv = String(input.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV deve ser development, test ou production.');
  }
  const port = Number(input.PORT ?? 3100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser uma porta válida.');
  }
  const origins = String(
    input.CORS_ORIGINS ?? (nodeEnv === 'production' ? '' : 'http://localhost:4200'),
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origins.length) throw new Error('CORS_ORIGINS é obrigatório.');
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS contém uma origem inválida.');
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== origin ||
      (nodeEnv === 'production' && url.protocol !== 'https:')
    ) {
      throw new Error('CORS_ORIGINS deve conter origens explícitas; produção exige HTTPS.');
    }
  }
  const firebaseMode = String(input.FIREBASE_MODE ?? 'disabled');
  if (!['disabled', 'emulator', 'production'].includes(firebaseMode)) {
    throw new Error('FIREBASE_MODE deve ser disabled, emulator ou production.');
  }
  const projectId = String(input.FIREBASE_PROJECT_ID ?? '');
  const authHost = String(input.FIREBASE_AUTH_EMULATOR_HOST ?? '');
  const firestoreHost = String(input.FIRESTORE_EMULATOR_HOST ?? '');
  if (firebaseMode === 'emulator') {
    if (nodeEnv === 'production' || !/^demo-[a-z0-9-]+$/.test(projectId)) {
      throw new Error('Emulação exige projeto demo- e ambiente não produtivo.');
    }
    if (authHost !== '127.0.0.1:9099' || firestoreHost !== '127.0.0.1:8080') {
      throw new Error('Emulação exige hosts locais explícitos de Auth e Firestore.');
    }
  } else if (authHost || firestoreHost) {
    throw new Error('Hosts de emuladores só são aceitos em FIREBASE_MODE=emulator.');
  }
  if (firebaseMode === 'production') {
    const credentials = String(input.GOOGLE_APPLICATION_CREDENTIALS ?? '');
    if (
      !projectId ||
      projectId.startsWith('demo-') ||
      !isAbsolute(credentials) ||
      !existsSync(credentials)
    ) {
      throw new Error(
        'Firebase de produção exige projeto real e arquivo de credenciais externo existente.',
      );
    }
  }
  return {
    ...input,
    NODE_ENV: nodeEnv,
    PORT: port,
    CORS_ORIGINS: origins,
    FIREBASE_MODE: firebaseMode,
  };
}
