import { test, expect } from '@playwright/test';
import type { Page, APIRequestContext } from '@playwright/test';
import { writeFileSync, rmSync } from 'node:fs';
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
  `adaptation-browser-${randomUUID()}`,
);
const auth = getAuth(admin);
const store = getFirestore(admin);
const owned: string[] = [];
const password = randomUUID();

test.afterEach(async () => {
  rmSync('.tools/checkpoint6-clock.json', { force: true });
  const failures: string[] = [];
  for (const uid of owned.splice(0)) {
    try {
      const profile = store.doc(`users/${uid}`);
      const assessment = profile.collection('assessments').doc('initial');
      const results = await assessment.collection('results').get();
      for (const doc of results.docs) await doc.ref.delete();
      await profile.collection('adaptations').doc('initial').delete();
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

const clock = (now: string) =>
  writeFileSync('.tools/checkpoint6-clock.json', JSON.stringify({ now }));
const sections = {
  body: {
    dateOfBirth: '1990-05-15',
    sexForMetabolicFormula: 'male',
    heightCm: 175,
    weightKg: 75,
    scaleType: 'standard',
  },
  health: { conditions: [], hasNoKnownConditions: true, isConditionUnknown: false, symptoms: [] },
  routine: {
    workPattern: 'sedentary',
    sittingHoursPerDay: 10,
    dailyMovementLevel: 'low',
    strengthTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' },
    cardioTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' },
  },
  nutrition: {
    mealsPerDay: 3,
    mealRegularity: 'regular',
    hasKitchenScale: false,
    sweetenedDrinksFrequency: 'never',
    alcoholFrequency: 'never',
    budgetConstrained: false,
    dietaryPreferences: [],
    allergies: [],
    intolerances: [],
    dietaryRestrictions: [],
    mealSources: ['home_cooked'],
    weightLossChallenges: [],
  },
};
async function seed(
  request: APIRequestContext,
  headers: Record<string, string>,
  health: {
    conditions: string[];
    hasNoKnownConditions: boolean;
    isConditionUnknown: boolean;
    symptoms: string[];
  } = sections.health,
  weightKg = 75,
) {
  for (const [section, data] of Object.entries({
    ...sections,
    body: { ...sections.body, weightKg },
    health,
  })) {
    expect(
      (
        await request.patch('/api/v1/assessments/me', { headers, data: { section, data } })
      ).status(),
    ).toBe(200);
  }
  const result = await request.post('/api/v1/assessments/me/evaluate', { headers });
  expect(result.status()).toBe(201);
  return result.json();
}
async function responsive(page: Page, label: string) {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${label} em ${width}`,
    ).toBe(true);
    await page.screenshot({
      path: `.tools/checkpoint6-evidence/${label}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
test.use({ timezoneId: 'America/Sao_Paulo' });
test('adaptação real: início manual, persistência, calendário 30 dias, conclusão e isolamento', async ({
  page,
  request,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const user = await identity(request);
  await seed(request, user.headers);
  clock('2026-10-31T23:30:00.000Z');
  await login(page, user.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/adaptacao');
  await expect(
    page.getByRole('heading', { name: 'Escolha sua Modalidade de Adaptação' }),
  ).toBeVisible();
  await expect(page.getByText('não constitui liberação clínica.', { exact: false })).toBeVisible();
  await expect(page.getByText('Intensificada indisponível:', { exact: false })).toBeVisible();
  const standard = page.getByRole('radio').filter({ hasText: 'Modalidade Padrão' });
  await standard.focus();
  await page.keyboard.press('Space');
  await expect(standard).toHaveAttribute('aria-checked', 'true');
  await expect(
    page.getByRole('radio').filter({ hasText: 'Modalidade Intensificada' }),
  ).toHaveAttribute('aria-disabled', 'true');
  await responsive(page, 'modalidades');
  expect((await store.doc(`users/${user.uid}/adaptations/initial`).get()).exists).toBe(false);
  await page.getByRole('button', { name: 'Iniciar meus 30 dias →', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await responsive(page, 'confirmacao');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Iniciar meus 30 dias →', exact: true }).click();
  const started = page.waitForResponse((r) => r.url().endsWith('/adaptation/me/start'));
  await page.getByRole('button', { name: 'Confirmar e Iniciar Meus 30 Dias' }).click();
  expect((await started).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Dia 1 de 30', exact: true })).toBeVisible();
  const reference = store.doc(`users/${user.uid}/adaptations/initial`);
  const saved = (await reference.get()).data()!;
  expect(saved['startLocalDate']).toBe('2026-10-31');
  expect(saved['day30LocalDate']).toBe('2026-11-29');
  expect(saved['timeZone']).toBe('America/Sao_Paulo');
  expect(saved['calorieTarget']).toBeUndefined();
  const duplicate = await request.post('/api/v1/adaptation/me/start', {
    headers: user.headers,
    data: { mode: 'standard', timeZone: 'America/Sao_Paulo' },
  });
  expect(duplicate.status()).toBe(200);
  expect((await duplicate.json()).startedAt).toBe(saved['startedAt']);
  expect((await reference.parent.get()).size).toBe(1);
  expect(
    (
      await request.post('/api/v1/adaptation/me/start', {
        headers: user.headers,
        data: { mode: 'standard', timeZone: 'UTC' },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post('/api/v1/adaptation/me/start', {
        headers: user.headers,
        data: { mode: 'intensified', timeZone: 'UTC' },
      })
    ).status(),
  ).toBe(422);
  await responsive(page, 'dia1');
  clock('2026-11-01T01:30:00.000Z');
  expect(
    (await (await request.get('/api/v1/adaptation/me', { headers: user.headers })).json())
      .currentDay,
  ).toBe(1);
  for (let offset = 0; offset <= 30; offset++) {
    clock(new Date(Date.UTC(2026, 9, 31 + offset, 15)).toISOString());
    const response = await request.get('/api/v1/adaptation/me', { headers: user.headers });
    expect(response.status()).toBe(200);
    const plan = await response.json();
    expect(plan.currentDay).toBe(Math.min(offset + 1, 30));
    expect(plan.status).toBe(offset < 30 ? 'active' : 'completed');
    expect(plan.calendar).toHaveLength(30);
    expect(plan.elapsedDays).toBe(offset);
    expect(plan.remainingDays).toBe(30 - offset);
    expect(plan.calendarProgressPercent).toBe(Math.round((offset / 30) * 1000) / 10);
    expect(plan.calorieTarget).toBeNull();
    expect(
      plan.calendar.filter((d: { temporalState: string }) => d.temporalState === 'past'),
    ).toHaveLength(offset);
    if ([0, 6, 13, 20, 29, 30].includes(offset)) {
      await page.reload();
      await expect(
        page.getByRole('heading', {
          name: offset === 30 ? '30 Dias Concluídos' : `Dia ${offset + 1} de 30`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        String(plan.calendarProgressPercent),
      );
      await expect(
        page.getByText('Dias passados representam o tempo percorrido.', { exact: false }),
      ).toBeVisible();
    }
  }
  await expect(
    page.getByText('O calendário não comprova adesão a hábitos ou resultado clínico.', {
      exact: false,
    }),
  ).toBeVisible();
  await responsive(page, 'conclusao');
  expect((await reference.get()).data()).toEqual(saved); // relógio altera respostas, nunca o documento.
  const direct = await request.get(
    `http://127.0.0.1:8080/v1/projects/demo-queimando-gordura/databases/(default)/documents/users/${user.uid}/adaptations/initial`,
    { headers: user.headers },
  );
  expect(direct.status()).toBe(403);
  for (const endpoint of ['/adaptation/me', '/adaptation/me/preview'])
    expect((await request.get('/api/v1' + endpoint)).status()).toBe(401);
  await page.goto('/painel');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  const other = await identity(request);
  await login(page, other.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/adaptacao');
  await expect(page.getByRole('heading', { name: 'Avaliação Inicial Necessária' })).toBeVisible();
  expect(
    (
      await request.get(`/api/v1/adaptation/me?uid=${user.uid}`, { headers: other.headers })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post('/api/v1/adaptation/me/start', {
        headers: other.headers,
        data: { mode: 'standard', timeZone: 'UTC', uid: user.uid },
      })
    ).status(),
  ).toBe(400);
  expect((await reference.get()).data()).toEqual(saved);
  expect(errors).toEqual([]);
});
test('segurança real: IMC 40 isolado, condições adicionais, sintomas, avaliação incompleta e revisão alterada', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const user = await identity(request);
  expect(
    (await request.get('/api/v1/adaptation/me/preview', { headers: user.headers })).status(),
  ).toBe(404);
  await request.patch('/api/v1/assessments/me', {
    headers: user.headers,
    data: { section: 'body', data: sections.body },
  });
  expect(
    (await request.get('/api/v1/adaptation/me/preview', { headers: user.headers })).status(),
  ).toBe(422);
  await seed(request, user.headers, sections.health, 140);
  const preview = () => request.get('/api/v1/adaptation/me/preview', { headers: user.headers });
  let result = await (await preview()).json();
  expect(result.modes.standard.available).toBe(true);
  expect(result.modes.intensified.available).toBe(false);
  expect(result.notices.some((n: { code: string }) => n.code === 'OBESITY_CLASS_3_GUIDANCE')).toBe(
    true,
  );
  await login(page, user.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/adaptacao');
  await expect(
    page.getByText('O acompanhamento multidisciplinar é fundamental', { exact: false }),
  ).toBeVisible();
  for (const condition of ['type_2_diabetes', 'hypertension', 'other_condition']) {
    await seed(
      request,
      user.headers,
      { ...sections.health, hasNoKnownConditions: false, conditions: [condition] },
      140,
    );
    result = await (await preview()).json();
    expect(result.modes.standard.available).toBe(false);
    expect(
      (
        await request.post('/api/v1/adaptation/me/start', {
          headers: user.headers,
          data: { mode: 'standard', timeZone: 'UTC' },
        })
      ).status(),
    ).toBe(422);
  }
  await seed(request, user.headers, { ...sections.health, symptoms: ['chest_pain'] });
  result = await (await preview()).json();
  expect(result.modes.standard.available).toBe(false);
  await page.reload();
  await expect(
    page.getByText('É indispensável buscar avaliação médica presencial imediatamente', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Iniciar meus 30 dias →', exact: true }),
  ).toBeDisabled();
  await responsive(page, 'alerta');
  await request.patch('/api/v1/assessments/me', {
    headers: user.headers,
    data: { section: 'body', data: { weightKg: 78 } },
  });
  expect((await preview()).status()).toBe(409);
  await page.reload();
  await expect(page.getByText('Sua avaliação foi alterada.', { exact: false })).toBeVisible();
  expect((await store.doc(`users/${user.uid}/adaptations/initial`).get()).exists).toBe(false);
});
