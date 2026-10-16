import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { applicationDefault, initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { assertCloudTestEnvironment } from '../../backend/scripts/cloud-safety.mjs';

assertCloudTestEnvironment();
const projectId = 'queimando-gordura-783e4';
const admin = initializeApp(
  { projectId, credential: applicationDefault() },
  `browser-cloud-${randomUUID()}`,
);
const auth = getAuth(admin);
const firestore = getFirestore(admin);
const email = `qg-cloud-browser-${randomUUID()}@example.test`;
const password = randomUUID() + 'aA1!';
let ownedUid: string | undefined;

test.afterAll(async () => {
  try {
    const user = ownedUid ? await auth.getUser(ownedUid) : null;
    if (user) {
      const reference = firestore.doc(`users/${user.uid}`);
      await reference.delete();
      await auth.deleteUser(user.uid);
      expect((await reference.get()).exists).toBe(false);
      await expect(auth.getUser(user.uid)).rejects.toMatchObject({ code: 'auth/user-not-found' });
    }
  } finally {
    await firestore.terminate();
    await deleteApp(admin);
  }
});

test('Angular Cloud DEV: landing, cadastro, confirmação oficial, sessão, conta e logout', async ({
  page,
  request,
}) => {
  await expect(auth.getUserByEmail(email)).rejects.toMatchObject({ code: 'auth/user-not-found' });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/cloud-landing-mobile.png', fullPage: true });
  await page.goto('/entrar');
  await page.locator('#email').fill('qg-nonexistent-' + randomUUID() + '@example.test');
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.goto('/cadastrar');
  await page.locator('#firstName').fill('Teste');
  await page.locator('#lastName').fill('Nuvem');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.locator('#age18Confirmed').check();
  const putResponse = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/users/me') && r.request().method() === 'PUT',
  );
  const registrationResponse = page.waitForResponse(
    (r) => r.url().includes('/v1/accounts:signUp?') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  const registration = await registrationResponse;
  expect(registration.status()).toBe(200);
  ownedUid = (await registration.json()).localId;
  expect((await putResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/verificar-email$/);
  const user = await auth.getUserByEmail(email);
  expect(user.uid).toBe(ownedUid);
  expect(user.emailVerified).toBe(false);
  expect((await firestore.doc(`users/${user.uid}`).get()).data()).toMatchObject({
    firstName: 'Teste',
    uid: user.uid,
  });
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/verificar-email$/);
  await page.getByRole('button', { name: 'Já confirmei meu e-mail' }).click();
  await expect(page.getByRole('alert')).toContainText('ainda não consta como confirmado');
  let link = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      link = await auth.generateEmailVerificationLink(email);
      break;
    } catch (error) {
      const raw =
        (error as { cause?: { response?: { data?: { error?: { message?: string } } } } }).cause
          ?.response?.data?.error?.message ?? '';
      const code = raw.split(':')[0]?.trim() ?? 'UNKNOWN';
      const safeCode = /^[A-Z0-9_]+$/.test(code) ? code : 'UNKNOWN';
      if (safeCode !== 'TOO_MANY_ATTEMPTS_TRY_LATER' || attempt === 4)
        throw new Error(`Firebase recusou geração do link oficial: ${safeCode}`);
      // Sending verification during signup can throttle immediate link generation for the same user.
      console.log('Firebase aplicou limite temporário de ações de e-mail; aguardando 20s.');
      await new Promise((resolve) => setTimeout(resolve, 20000));
    }
  }
  const verified = await request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env['FIREBASE_WEB_API_KEY']}`,
    {
      data: { oobCode: new URL(link).searchParams.get('oobCode') },
    },
  );
  expect(verified.ok()).toBe(true);
  const profileResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/users/me') && r.request().method() === 'GET' && r.status() === 200,
  );
  await page.getByRole('button', { name: 'Já confirmei meu e-mail' }).click();
  const response = await profileResponse;
  const bearer = response.request().headers()['authorization'];
  if (!bearer?.startsWith('Bearer ')) throw new Error('Authorization ausente.');
  expect((await auth.verifyIdToken(bearer.slice(7))).email_verified).toBe(true);
  expect((await response.json()).uid).toBe(user.uid);
  await expect(page).toHaveURL(/\/painel$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Teste Nuvem');
  await page.goto('/minha-conta');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Minha Conta');
  await expect(page.getByRole('main').getByText(email, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/cloud-account-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/cloud-account-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto('/recuperar-senha');
  await page.locator('#email').fill(email);
  const recoveryResponse = page.waitForResponse(
    (r) =>
      r.url().includes('/v1/accounts:sendOobCode?') &&
      r.request().postDataJSON()?.requestType === 'PASSWORD_RESET',
  );
  await page.getByRole('button', { name: 'Enviar instruções de recuperação' }).click();
  expect((await recoveryResponse).status()).toBe(200);
  await expect(page.getByRole('status')).toContainText('instruções');
  expect(pageErrors).toEqual([]);
});
