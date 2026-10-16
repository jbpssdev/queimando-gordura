import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCloudTestEnvironment } from './cloud-safety.mjs';

const valid = {
  FIREBASE_PROJECT_ID: 'queimando-gordura-783e4',
  FIREBASE_ALLOW_CLOUD_TEST: 'true',
  FIREBASE_MODE: 'production',
  FIREBASE_USE_ADC: 'true',
  FIREBASE_WEB_API_KEY: 'public-config-present',
  NODE_ENV: 'test',
};
test('permite somente o projeto DEV explicitamente autorizado', () => {
  assert.doesNotThrow(() => assertCloudTestEnvironment(valid));
  for (const project of ['another-dev-project', 'demo-queimando-gordura', '', 'production']) {
    assert.throws(() => assertCloudTestEnvironment({ ...valid, FIREBASE_PROJECT_ID: project }));
  }
});
test('recusa produção, emuladores e autorização ausente', () => {
  for (const patch of [
    { NODE_ENV: 'production' },
    { FIREBASE_ALLOW_CLOUD_TEST: '' },
    { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' },
    { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
    { FIREBASE_WEB_API_KEY: '' },
    { FIREBASE_USE_ADC: 'false' },
  ])
    assert.throws(() => assertCloudTestEnvironment({ ...valid, ...patch }));
});
