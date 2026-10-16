import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let environment;
before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-queimando-gordura',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await readFile(new URL('./firestore.rules', import.meta.url), 'utf8'),
    },
  });
});
after(async () => {
  await environment?.cleanup();
});

test('nega leitura e escrita direta de clientes anônimos e autenticados', async () => {
  for (const context of [
    environment.unauthenticatedContext(),
    environment.authenticatedContext('rules-test-user'),
  ]) {
    const reference = doc(context.firestore(), 'security-probe', 'denied');
    await assertFails(getDoc(reference));
    await assertFails(setDoc(reference, { denied: true }));
  }
});
