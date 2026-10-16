import { test, expect } from '@playwright/test';
import type { Page, APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (
  process.env['FIREBASE_PROJECT_ID'] !== 'demo-queimando-gordura' ||
  process.env['FIREBASE_AUTH_EMULATOR_HOST'] !== '127.0.0.1:9099' ||
  process.env['FIRESTORE_EMULATOR_HOST'] !== '127.0.0.1:8080'
)
  throw new Error('Avaliação integrada exige exclusivamente os emuladores demo locais.');
test.skip(process.env['QG_TEST_API_DISABLED'] === '1');
const admin = initializeApp(
  { projectId: 'demo-queimando-gordura' },
  `assessment-browser-${randomUUID()}`,
);
const auth = getAuth(admin);
const store = getFirestore(admin);
const owned: string[] = [];
const password = randomUUID();

test.afterEach(async () => {
  const failures: string[] = [];
  for (const uid of owned.splice(0)) {
    try {
      const profile = store.doc(`users/${uid}`);
      const assessment = profile.collection('assessments').doc('initial');
      const results = await assessment.collection('results').get();
      for (const doc of results.docs) await doc.ref.delete();
      await assessment.delete();
      await profile.delete();
      await auth.deleteUser(uid);
      expect((await assessment.get()).exists).toBe(false);
      expect((await assessment.collection('results').get()).empty).toBe(true);
      await expect(auth.getUser(uid)).rejects.toMatchObject({ code: 'auth/user-not-found' });
    } catch {
      failures.push(uid);
    }
  }
  expect(failures).toEqual([]);
});
test.afterAll(async () => {
  await store.terminate();
  await deleteApp(admin);
});

async function identity(request: APIRequestContext, withProfile = true) {
  const email = `qg-assessment-${randomUUID()}@example.test`;
  const response = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-emulator-key',
    { data: { email, password, returnSecureToken: true } },
  );
  expect(response.status()).toBe(200);
  const created = await response.json();
  owned.push(created.localId);
  await auth.updateUser(created.localId, { emailVerified: true });
  const login = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-emulator-key',
    { data: { email, password, returnSecureToken: true } },
  );
  expect(login.status()).toBe(200);
  const { idToken } = await login.json();
  const headers = { Authorization: `Bearer ${idToken}` };
  if (withProfile)
    expect(
      (
        await request.put('/api/v1/users/me', {
          headers,
          data: { firstName: 'Pessoa', lastName: 'Temporária', age18Confirmed: true },
        })
      ).status(),
    ).toBe(200);
  return { uid: created.localId, email, headers, idToken };
}
async function login(page: Page, email: string) {
  await page.goto('/entrar');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
async function radio(page: Page, control: string, value: string) {
  const input = [
    'practicesStrengthTraining',
    'practicesCardio',
    'takesContinuousMedication',
    'hasMedicalFollowUp',
  ].includes(control)
    ? page.locator(`input[formcontrolname="${control}"]`).nth(value === 'true' ? 1 : 0)
    : page.locator(`input[formcontrolname="${control}"][value="${value}"]`);
  await input.locator('..').click();
  await expect(input).toBeChecked();
}
async function save(page: Page, next: string) {
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/assessments/me') && r.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: next }).click();
  expect((await response).status()).toBe(200);
}
async function evaluate(page: Page) {
  const response = page.waitForResponse((r) => r.url().endsWith('/api/v1/assessments/me/evaluate'));
  await page.getByRole('button', { name: 'Concluir Avaliação e Ver Resultados →' }).click();
  const api = await response;
  expect(api.status()).toBe(201);
  const result = await api.json();
  await expect(page).toHaveURL(/\/avaliacao\/resultados$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Suas Estimativas Metabólicas e Corporais',
  );
  return result;
}
async function responsive(page: Page, label: string) {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: `.tools/checkpoint5-evidence/${label}-${width}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('main *, header *')]
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 6)
        .map((e) => ({
          tag: e.tagName,
          classes: e.className,
          right: e.getBoundingClientRect().right,
        })),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${label}: sem overflow em ${width}: ${JSON.stringify(overflow)}`,
    ).toBe(true);
    await page.screenshot({
      path: `.tools/checkpoint5-evidence/${label}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

test('avaliação real: etapas, rascunho, resultados da API, revisão, segurança e isolamento', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const user = await identity(request);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, user.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/avaliacao');
  await page.locator('#birthDate').fill('1990-05-15');
  await radio(page, 'biologicalSex', 'male');
  await page.locator('#heightCm').fill('175,53');
  await page.locator('#currentWeightKg').fill('82,73');
  await page.locator('#targetWeightKg').fill('72,3');
  await page.locator('#waistCircumferenceCm').fill('98,2');
  await radio(page, 'scaleType', 'bioimpedance');
  await page.locator('#bodyFatPercentage').fill('28,4');
  await page.locator('#muscleMassKg').fill('35,2');
  await responsive(page, 'corpo');
  const contrast = await page
    .getByRole('button', { name: 'Salvar e Avançar para Saúde →' })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      const context = document.createElement('canvas').getContext('2d')!;
      function luminance(color: string) {
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const pixels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((c) => {
          const v = c / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return pixels[0]! * 0.2126 + pixels[1]! * 0.7152 + pixels[2]! * 0.0722;
      }
      const a = luminance(style.color),
        b = luminance(style.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await save(page, 'Salvar e Avançar para Saúde →');
  await radio(page, 'declarationType', 'conditions');
  await page.locator('label').filter({ hasText: 'Cardiovascular' }).click();
  await responsive(page, 'saude');
  await save(page, 'Salvar e Avançar para Rotina →');
  // Reload destroys the application instance: restored values must come from Firestore through Nest.
  await page.reload();
  await expect(page.locator('#currentWeightKg')).toHaveValue('82,73');
  await expect(page.locator('#waistCircumferenceCm')).toHaveValue('98,2');
  // Editing must preserve decimals, not format them back to a single decimal before persistence.
  await expect(page.locator('#heightCm')).toHaveValue('175.53');
  await save(page, 'Salvar e Avançar para Saúde →');
  await save(page, 'Salvar e Avançar para Rotina →');
  await page.locator('#sittingHoursPerDay').fill('11');
  await page.locator('#dailySteps').fill('6000');
  await page.locator('#stepsSource').selectOption('phone');
  await radio(page, 'dailyMovementLevel', 'low');
  await radio(page, 'practicesStrengthTraining', 'true');
  await page.locator('#strengthDaysPerWeek').fill('3');
  await page.locator('#strengthMinutesPerSession').fill('45');
  await radio(page, 'strengthIntensity', 'moderate');
  await responsive(page, 'rotina');
  await save(page, 'Salvar e Avançar para Alimentação →');
  await page.locator('#dailyMealsCount').fill('4');
  await radio(page, 'cookingHabit', 'delivery');
  await radio(page, 'alcoholConsumption', 'occasional');
  await responsive(page, 'alimentacao');
  await save(page, 'Salvar e Revisar Avaliação →');
  const result = await evaluate(page);
  expect(result.body.weightKg).toBe(82.73);
  expect(result.pendingItems.some((p: { field: string }) => p.field === 'averageStepsPerDay')).toBe(
    false,
  );
  expect(result.body.heightCm).toBe(175.53);
  expect(result.safety.requiresProfessionalClearance).toBe(true);
  await expect(page.getByText('Orientação de Segurança e Atenção Individualizada')).toBeVisible();
  const main = page.getByRole('main');
  for (const number of [result.bmi.value, result.weightReference.milestone5PercentWeightKg])
    await expect(main).toContainText(number.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
  await expect(main).toContainText(
    result.bmr.bmrKcal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
  );
  await responsive(page, 'resultados');
  const initialRef = store.doc(`users/${user.uid}/assessments/initial`);
  expect(
    (await initialRef.collection('results').doc(`rev_${result.revision}`).get()).data()?.['bmi'],
  ).toEqual(result.bmi);
  await page.goto('/avaliacao');
  await expect(page.locator('#currentWeightKg')).toHaveValue('82,73');
  await page.locator('#currentWeightKg').fill('81,15');
  await page.locator('#targetWeightKg').fill('70');
  await radio(page, 'scaleType', 'standard');
  await save(page, 'Salvar e Avançar para Saúde →');
  expect(
    (await request.get('/api/v1/assessments/me/results', { headers: user.headers })).status(),
  ).toBe(409);
  await page.setViewportSize({ width: 768, height: 900 });
  await page
    .getByRole('navigation', { name: 'Progresso da avaliação' })
    .getByRole('button', { name: /Conclusão/ })
    .click();
  const updated = await evaluate(page);
  expect(updated.revision).toBeGreaterThan(result.revision);
  expect(updated.bmi.value).not.toBe(result.bmi.value);
  expect(updated.weightReference.targetWeightAnalysis.targetWeightKg).toBe(70);
  const persisted = (await initialRef.get()).data();
  expect(persisted?.['sections'].body.bodyFatPercent).toBeUndefined();
  expect(
    (await initialRef.collection('results').doc(`rev_${result.revision}`).get()).data()?.['bmi'],
  ).toEqual(result.bmi);
  const storage = await page.evaluate(() =>
    Object.entries(localStorage).filter(([key]) => !/firebase:/.test(key)),
  );
  expect(JSON.stringify(storage)).not.toMatch(/cardiovascular|82[.,]73|assessment|bodyFat/i);
  await page.goto('/painel');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  const other = await identity(request);
  await login(page, other.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/avaliacao');
  await expect(page.locator('#currentWeightKg')).toHaveValue('');
  expect((await request.get('/api/v1/assessments/me', { headers: other.headers })).status()).toBe(
    404,
  );
  expect(
    (
      await request.patch('/api/v1/assessments/me', {
        headers: other.headers,
        data: { section: 'body', data: { uid: user.uid, weightKg: 60 } },
      })
    ).status(),
  ).toBe(400);
  await page.goto('/avaliacao/resultados');
  await expect(page.getByRole('main')).toContainText('Conclua a avaliação');
  expect((await initialRef.get()).data()?.['sections'].body.weightKg).toBe(81.15);
  expect(errors).toEqual([]);
});

test('avaliação: menor, valores inválidos e perfil incompleto são bloqueados', async ({
  page,
  request,
}) => {
  const user = await identity(request);
  await login(page, user.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/avaliacao');
  await page.locator('#birthDate').fill('2015-05-15');
  await page.locator('#heightCm').fill('175');
  await page.locator('#currentWeightKg').fill('85');
  await expect(page.getByRole('button', { name: 'Salvar e Avançar para Saúde →' })).toBeDisabled();
  for (const data of [
    { dateOfBirth: '2015-05-15' },
    { heightCm: 0 },
    { weightKg: 401 },
    { dateOfBirth: '2005-02-29' },
  ]) {
    expect(
      (
        await request.patch('/api/v1/assessments/me', {
          headers: user.headers,
          data: { section: 'body', data },
        })
      ).status(),
    ).toBe(400);
  }
  await page.goto('/painel');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  const incomplete = await identity(request, false);
  await login(page, incomplete.email);
  await expect(page).toHaveURL(/\/completar-perfil$/);
  await page.goto('/avaliacao');
  await expect(page).toHaveURL(/\/completar-perfil$/);
});
