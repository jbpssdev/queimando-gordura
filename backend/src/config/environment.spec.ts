import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';

describe('configuração de ambiente', () => {
  it('permite execução local sem segredos', () => {
    expect(validateEnvironment({})).toMatchObject({
      PORT: 3100,
      FIREBASE_MODE: 'disabled',
      CORS_ORIGINS: ['http://localhost:4200'],
    });
  });
  it.each([
    { PORT: 0 },
    { NODE_ENV: 'invalid' },
    { CORS_ORIGINS: '*' },
    { NODE_ENV: 'production' },
    { NODE_ENV: 'production', CORS_ORIGINS: 'http://example.com' },
    { FIREBASE_MODE: 'production' },
    { FIREBASE_MODE: 'emulator', FIREBASE_PROJECT_ID: 'real-project' },
    { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' },
  ])('rejeita configuração insegura: %j', (config) => {
    expect(() => validateEnvironment(config)).toThrow();
  });
  it('aceita somente emulação com projeto demo e hosts locais', () => {
    expect(
      validateEnvironment({
        FIREBASE_MODE: 'emulator',
        FIREBASE_PROJECT_ID: 'demo-queimando-gordura',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      }).FIREBASE_MODE,
    ).toBe('emulator');
  });
});
