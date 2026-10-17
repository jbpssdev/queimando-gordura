import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = 'demo-queimando-gordura';
if (
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] !== '127.0.0.1:9099' ||
  process.env['FIRESTORE_EMULATOR_HOST'] !== '127.0.0.1:8080' ||
  process.env['FIREBASE_PROJECT_ID'] !== projectId
) {
  throw new Error('Este teste exige exclusivamente os emuladores locais demo.');
}
const admin = initializeApp({ projectId }, `browser-integration-${randomUUID()}`);
const auth = getAuth(admin);
const firestore = getFirestore(admin);
const emails: string[] = [];
const password = randomUUID();
const disabled = process.env['QG_TEST_API_DISABLED'] === '1';

test('falha parcial avaliação: API realmente desativada responde 503 nos quatro contratos', async ({
  request,
}) => {
  test.skip(!disabled);
  for (const [method, path] of [
    ['get', ''],
    ['patch', ''],
    ['post', '/evaluate'],
    ['get', '/results'],
  ] as const) {
    const response = await request[method]('/api/v1/assessments/me' + path);
    expect(response.status()).toBe(503);
  }
});

test('falha parcial adaptação: API desativada retorna 503 nos três endpoints', async ({
  request,
}) => {
  test.skip(!disabled);
  for (const [method, path] of [
    ['get', ''],
    ['get', '/preview'],
    ['post', '/start'],
  ] as const) {
    expect((await request[method]('/api/v1/adaptation/me' + path)).status()).toBe(503);
  }
});

test('falha parcial diário e catálogo: Firebase desativado retorna 503 sem dados fictícios', async ({
  request,
}) => {
  test.skip(!disabled);
  for (const [method, path] of [
    ['get', '/foods?query=arroz'],
    ['get', '/diary/me?date=2026-10-17'],
    ['post', '/diary/me/meals'],
    ['post', '/diary/me/water'],
    ['post', '/diary/me/activities'],
    ['put', '/diary/me/weight'],
  ] as const) {
    expect((await request[method]('/api/v1' + path)).status()).toBe(503);
  }
});

function temporaryEmail(): string {
  const email = `qg-browser-${randomUUID()}@example.test`;
  emails.push(email);
  return email;
}

test.afterEach(async () => {
  for (const email of emails.splice(0)) {
    const user = await auth.getUserByEmail(email).catch((error: { code: string }) => {
      if (error.code !== 'auth/user-not-found') throw error;
      return null;
    });
    if (!user) continue;
    const document = firestore.collection('users').doc(user.uid);
    await document.delete();
    await auth.deleteUser(user.uid);
    expect((await document.get()).exists).toBe(false);
    await expect(auth.getUser(user.uid)).rejects.toMatchObject({ code: 'auth/user-not-found' });
  }
});
test.afterAll(async () => {
  await firestore.terminate();
  await deleteApp(admin);
});

async function fillRegistration(page: Page, email: string) {
  await page.goto('/cadastrar');
  await page.locator('#firstName').fill('Ana');
  await page.locator('#lastName').fill('Integração');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.locator('#age18Confirmed').check();
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
}

async function login(page: Page, email: string) {
  await page.goto('/entrar');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

test('cadastro Angular → token → API → Firestore → confirmação → painel → logout e login', async ({
  page,
  request,
}) => {
  test.skip(disabled);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const email = temporaryEmail();
  let authorizedPut = false;
  page.on('request', (req) => {
    if (req.url().endsWith('/api/v1/users/me') && req.method() === 'PUT') {
      authorizedPut = req.headers()['authorization']?.startsWith('Bearer ') ?? false;
    }
  });
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/entrar/);
  await fillRegistration(page, email);
  await expect(page).toHaveURL(/\/verificar-email$/);
  expect(authorizedPut).toBe(true);
  const user = await auth.getUserByEmail(email);
  expect(user.emailVerified).toBe(false);
  expect((await firestore.collection('users').doc(user.uid).get()).data()).toMatchObject({
    uid: user.uid,
    firstName: 'Ana',
    lastName: 'Integração',
  });
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/verificar-email$/);
  await page.getByRole('button', { name: 'Já confirmei meu e-mail' }).click();
  await expect(page.getByRole('alert')).toContainText('ainda não consta como confirmado');

  let oobCode = '';
  await expect
    .poll(async () => {
      const response = await request.get(
        `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`,
      );
      const data = (await response.json()) as {
        oobCodes: { email: string; requestType: string; oobCode: string }[];
      };
      oobCode =
        data.oobCodes.find((code) => code.email === email && code.requestType === 'VERIFY_EMAIL')
          ?.oobCode ?? '';
      return Boolean(oobCode);
    })
    .toBe(true);
  const confirmation = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-emulator-key',
    { data: { oobCode } },
  );
  expect(confirmation.ok()).toBe(true);
  const loaded = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/users/me') &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );
  await page.getByRole('button', { name: 'Já confirmei meu e-mail' }).click();
  const profileResponse = await loaded;
  const bearer = profileResponse.request().headers()['authorization'];
  if (!bearer?.startsWith('Bearer ')) throw new Error('Cabeçalho Authorization ausente.');
  const refreshedClaims = await auth.verifyIdToken(bearer.slice(7));
  expect(refreshedClaims.email_verified).toBe(true);
  const profile = (await profileResponse.json()) as { uid: string; emailVerified: boolean };
  expect(profile.uid).toBe(user.uid);
  expect(profile.emailVerified).toBe(true);
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ana Integração');
  await page.screenshot({ path: 'test-results/integration-dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await login(page, email);
  await expect(page).toHaveURL(/\/painel$/);
  expect(errors).toEqual([]);
});

test('perfil inexistente é concluído após login e não dá acesso ao perfil de outra identidade', async ({
  page,
}) => {
  test.skip(disabled);
  const email = temporaryEmail();
  const user = await auth.createUser({ email, password, emailVerified: true });
  await login(page, email);
  await expect(page).toHaveURL(/\/completar-perfil$/);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.locator('#firstName').fill('Bruno');
  await page.locator('#lastName').fill('Isolado');
  await page.locator('#age18Confirmed').check();
  await page.getByRole('button', { name: 'Salvar e acessar o painel' }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bruno Isolado');
  expect((await firestore.collection('users').doc(user.uid).get()).data()?.['firstName']).toBe(
    'Bruno',
  );
});

test('falha parcial real: Auth cria identidade e API desativada retorna 503, sem duplicar cadastro', async ({
  page,
}) => {
  test.skip(!disabled);
  const email = temporaryEmail();
  let signups = 0;
  page.on('request', (req) => {
    if (req.url().includes('accounts:signUp')) signups++;
  });
  const failed = page.waitForResponse(
    (response) => response.url().endsWith('/api/v1/users/me') && response.status() === 503,
  );
  await fillRegistration(page, email);
  await failed;
  await expect(page.getByRole('alert')).toContainText('Conclusão Parcial do Cadastro');
  await expect(page.locator('#firstName')).toHaveValue('Ana');
  await expect(page.getByRole('button', { name: 'Criar conta', exact: true })).toBeDisabled();
  const user = await auth.getUserByEmail(email);
  expect((await firestore.collection('users').doc(user.uid).get()).exists).toBe(false);
  await page.getByRole('button', { name: 'Tentar salvar perfil novamente' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Ainda não foi possível conectar' }),
  ).toBeVisible();
  expect(signups).toBe(1);
  await page.getByRole('button', { name: 'Continuar para confirmação de e-mail' }).click();
  await expect(page).toHaveURL(/\/verificar-email$/);
});

test('falha parcial: consulta 503 não trata perfil existente como cadastro incompleto', async ({
  page,
}) => {
  test.skip(!disabled);
  const email = temporaryEmail();
  const user = await auth.createUser({ email, password, emailVerified: true });
  const document = firestore.collection('users').doc(user.uid);
  const profile = {
    uid: user.uid,
    firstName: 'Perfil',
    lastName: 'Preservado',
    email,
    age18Confirmed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await document.set(profile);
  await login(page, email);
  await expect(page.getByRole('alert')).toContainText('servidor está indisponível');
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/completar-perfil$/);
  await expect(page.getByRole('alert')).toContainText('O perfil não foi considerado inexistente');
  await expect(page.getByRole('button', { name: 'Salvar e acessar o painel' })).toBeDisabled();
  await page.getByRole('button', { name: 'Consultar perfil novamente' }).click();
  await expect(page.getByRole('alert')).toContainText('O perfil não foi considerado inexistente');
  expect((await document.get()).data()).toEqual(profile);
});
