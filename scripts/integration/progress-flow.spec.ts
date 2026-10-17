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
  `progress-browser-${randomUUID()}`,
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
      for (const name of [
        'customFoods',
        'diary_meals',
        'diary_water',
        'diary_activities',
        'diary_weights',
      ]) {
        const refs = await profile.collection(name).get();
        for (const doc of refs.docs) await doc.ref.delete();
        expect((await profile.collection(name).get()).empty).toBe(true);
      }
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
      path: `.tools/checkpoint8-evidence/${label}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

test.use({ timezoneId: 'America/Sao_Paulo' });
async function searchAndAdd(page: Page, name: string, amount: string, household = false) {
  await page.getByPlaceholder('Buscar por nome (ex.: Arroz, Frango, Maçã...)').fill(name);
  await page.getByRole('button').filter({ hasText: name }).last().click();
  if (household) {
    await page.locator('#item-unit-select').selectOption('household');
    await expect(page.locator('#item-measure-select option')).toHaveCount(3);
    await page.locator('#item-measure-select').selectOption('concha_media');
  }
  await page.locator('#item-amount-input').fill(amount);
  await page
    .getByRole('button', { name: '+ Adicionar este alimento à refeição', exact: true })
    .click();
}
async function day(request: APIRequestContext, headers: Record<string, string>, date: string) {
  const result = await request.get('/api/v1/diary/me?date=' + date, { headers });
  expect(result.status()).toBe(200);
  return result.json();
}
async function saveMeal(page: Page, method = 'POST') {
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/v1/diary/me/meals') && r.request().method() === method,
  );
  await page.getByRole('button', { name: 'Salvar Refeição', exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(method === 'POST' ? 201 : 200);
  await expect(page.getByRole('dialog', { name: /Refeição/ })).not.toBeVisible();
  return result.json();
}

const clock = (date: string) =>
  writeFileSync('.tools/checkpoint6-clock.json', JSON.stringify({ now: date + 'T15:00:00Z' }));
const addDays = (date: string, n: number) =>
  new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

test('ciclo completo real: evolução, conquistas, relógio, conclusão e PDF privado', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const date = '2026-10-31';
  clock(date);
  const user = await identity(request);
  await seed(request, user.headers);
  await login(page, user.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/adaptacao');
  await page.getByRole('button', { name: 'Iniciar meus 30 dias →', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar e Iniciar Meus 30 Dias' }).click();
  await expect(page.getByRole('heading', { name: 'Dia 1 de 30', exact: true })).toBeVisible();
  await responsive(page, 'adaptacao');
  const plan = await (await request.get('/api/v1/adaptation/me', { headers: user.headers })).json();
  expect(plan.calendar).toHaveLength(30);
  expect(plan.calorieTarget).toBeNull();
  await page.goto('/adaptacao/progresso');
  await expect(
    page.getByRole('heading', { name: 'Painel de Evolução e Consistência' }),
  ).toBeVisible();
  await expect(
    page.getByText('Nenhuma pesagem registrada no período', { exact: false }),
  ).toBeVisible();
  const progress = async () => {
    const r = await request.get('/api/v1/adaptation/me/progress', { headers: user.headers });
    expect(r.status()).toBe(200);
    expect(r.headers()['cache-control']).toContain('no-store');
    return r.json();
  };
  expect((await progress()).achievements.unlocked).toEqual([]);
  // A scheduled/future entry must not grant a current achievement.
  expect(
    (
      await request.put('/api/v1/diary/me/weight', {
        headers: user.headers,
        data: { date: addDays(date, 7), weightKg: 74.25 },
      })
    ).status(),
  ).toBe(200);
  expect((await progress()).weightEvolution.measurements).toEqual([]);
  await page.goto('/diario?date=' + date);
  await page.getByRole('button', { name: '+ Adicionar Refeição', exact: true }).click();
  await page.locator('#meal-title-input').fill('Prato temporário do ciclo 8C');
  await searchAndAdd(page, 'Arroz, tipo 1, cozido', '125.5');
  await searchAndAdd(page, 'Feijão, preto, cozido', '1', true);
  const meal = await saveMeal(page);
  expect(meal.items[1].weightG).toBe(140);
  const custom = await request.post('/api/v1/foods/me', {
    headers: user.headers,
    data: {
      name: 'Rótulo temporário 8C',
      source: 'Rótulo controlado exclusivo do teste',
      nutrientsPer100g: {
        energyKcal: 123.4567,
        proteinG: 0,
        carbohydrateG: 25.1234,
        fatG: 2,
        fiberG: null,
      },
    },
  });
  expect(custom.status()).toBe(201);
  const customFood = await custom.json();
  expect(
    (
      await request.post('/api/v1/diary/me/meals', {
        headers: user.headers,
        data: {
          date,
          mealType: 'snack',
          items: [{ foodId: customFood.id, amount: 45.375, unit: 'g' }],
          clientRequestId: randomUUID(),
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post('/api/v1/diary/me/water', {
        headers: user.headers,
        data: { date, amountMl: 250, clientRequestId: randomUUID() },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post('/api/v1/diary/me/activities', {
        headers: user.headers,
        data: {
          date,
          type: 'cardio',
          description: 'Caminhada temporária 8C',
          durationMinutes: 30,
          intensity: 'light',
          clientRequestId: randomUUID(),
        },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.put('/api/v1/diary/me/weight', {
        headers: user.headers,
        data: { date, weightKg: 75 },
      })
    ).status(),
  ).toBe(200);
  const persisted = await day(request, user.headers, date);
  expect(persisted.meals).toHaveLength(2);
  await page.reload();
  await expect(page.getByText('Prato temporário do ciclo 8C', { exact: true })).toBeVisible();
  await responsive(page, 'diario');
  const before = await progress();
  expect(before.participation).toEqual({
    distinctDaysRecorded: 1,
    daysWithMeals: 1,
    daysWithWater: 1,
    daysWithActivities: 1,
    daysWithWeight: 1,
  });
  expect(before.weightEvolution.weightDeltaKg).toBeNull();
  expect(before.achievements.unlocked).toHaveLength(4);
  for (const a of before.achievements.unlocked) expect(a.unlockedAt).toBe(date);
  // Real records on fourteen distinct dates; not fourteen rewards for repeated same-day posts.
  for (let i = 1; i < 14; i++) {
    clock(addDays(date, i));
    expect(
      (
        await request.post('/api/v1/diary/me/water', {
          headers: user.headers,
          data: { date: addDays(date, i), amountMl: 100, clientRequestId: randomUUID() },
        })
      ).status(),
    ).toBe(201);
  }
  for (const dayNumber of [1, 7, 14, 21, 30, 31]) {
    clock(addDays(date, dayNumber - 1));
    const p = await progress();
    expect(p.currentDay).toBe(Math.min(dayNumber, 30));
    expect(p.status).toBe(dayNumber === 31 ? 'completed' : 'active');
    expect(p.reportAvailable).toBe(dayNumber === 31);
    expect(p.participation.distinctDaysRecorded).toBe(Math.min(dayNumber, 14));
    const codes = p.achievements.unlocked.map((a: { code: string }) => a.code);
    expect(codes.includes('SEVEN_DISTINCT_DAYS_RECORDED')).toBe(dayNumber >= 7);
    expect(codes.includes('FOURTEEN_DISTINCT_DAYS_RECORDED')).toBe(dayNumber >= 14);
    expect(codes.includes('ADAPTATION_30_DAYS_COMPLETED')).toBe(dayNumber === 31);
    if (dayNumber === 30)
      expect(
        (await request.get('/api/v1/adaptation/me/report.pdf', { headers: user.headers })).status(),
      ).toBe(422);
  }
  // Return to day14 to validate active graph state with two real measurements.
  clock(addDays(date, 13));
  const middle = await progress();
  expect(middle.weightEvolution.weightDeltaKg).toBeCloseTo(-0.75, 10);
  expect(middle.weightEvolution.measurements.map((w: { weightKg: number }) => w.weightKg)).toEqual([
    75, 74.25,
  ]);
  expect(middle.derivedIndicators.currentBmi.value).toBeCloseTo(74.25 / (1.75 * 1.75), 1);
  expect(middle.derivedIndicators.currentBmr.bmrKcal).toBeCloseTo(
    10 * 74.25 + 6.25 * 175 - 5 * 36 + 5,
    1,
  );
  const storedWeights = await store.collection(`users/${user.uid}/diary_weights`).get();
  expect(storedWeights.docs.map((d) => d.data()['weightKg']).sort()).toEqual([74.25, 75]);
  await page.goto('/adaptacao/progresso');
  await expect(
    page.getByRole('heading', { name: 'Painel de Evolução e Consistência' }),
  ).toBeVisible();
  await expect(page.locator('svg circle.fill-primary')).toHaveCount(2);
  await expect(page.getByRole('button', { name: /Baixar Relatório/ })).toHaveCount(0);
  await responsive(page, 'progresso');
  await page.reload();
  await expect(page.locator('svg circle.fill-primary')).toHaveCount(2);
  const noData = await day(request, user.headers, addDays(date, 20));
  expect(noData.hasAnyEntries).toBe(false);
  expect(noData.nutritionTotals.energyKcal.value).toBeNull();
  // Keep optional clinical details private, including when a report exists.
  const clinical = 'MARCADOR_PRIVADO_8C';
  expect(
    (
      await request.patch('/api/v1/assessments/me', {
        headers: user.headers,
        data: {
          section: 'health',
          data: {
            ...sections.health,
            takesContinuousMedication: true,
            continuousMedications: [clinical],
          },
        },
      })
    ).status(),
  ).toBe(200);
  clock(addDays(date, 30));
  await page.goto('/adaptacao/conclusao');
  await expect(page.getByRole('heading', { name: /30 Dias/ }).first()).toBeVisible();
  await responsive(page, 'conclusao');
  await expect(page.locator('#completion-include-health')).not.toBeChecked();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Baixar Relatório dos 30 Dias/ }).click();
  await (await download).saveAs('.tools/checkpoint8-report-default.pdf');
  await page.locator('#completion-include-health').check();
  const healthDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: /Baixar Relatório dos 30 Dias/ }).click();
  await (await healthDownload).saveAs('.tools/checkpoint8-report-health.pdf');
  for (const includeHealthDetails of [false, true]) {
    const pdf = await request.get(
      '/api/v1/adaptation/me/report.pdf?includeHealthDetails=' + includeHealthDetails,
      { headers: user.headers },
    );
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['cache-control']).toContain('no-store');
    const bytes = await pdf.body();
    expect(bytes.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(bytes.toString('latin1').includes(clinical)).toBe(includeHealthDetails);
  }
  const final = await progress();
  expect(final.weightEvolution.initialDeclaredWeight.weightKg).toBe(75);
  expect(final.participation.distinctDaysRecorded).toBe(14);
  const finalMeals = await store.collection(`users/${user.uid}/diary_meals`).get();
  const expectedKcal = finalMeals.docs.reduce((s, d) => s + d.data()['totals'].energyKcal.value, 0);
  expect(final.weeklyPeriods[0].nutritionSummary.totalKcal).toBeCloseTo(expectedKcal, 10);
  writeFileSync(
    '.tools/checkpoint8-pdf-expected.json',
    JSON.stringify({
      date,
      endDate: plan.day30LocalDate,
      weightDates: [date, addDays(date, 7)],
      weights: [75, 74.25],
      energyKcal: expectedKcal,
      clinical,
      participation: 14,
    }),
  );
  const other = await identity(request);
  expect(
    (await request.get('/api/v1/adaptation/me/progress', { headers: other.headers })).status(),
  ).toBe(404);
  expect(
    (await request.get('/api/v1/adaptation/me/report.pdf', { headers: other.headers })).status(),
  ).toBe(404);
  expect((await request.get('/api/v1/adaptation/me/progress')).status()).toBe(401);
  expect((await request.get('/api/v1/adaptation/me/report.pdf')).status()).toBe(401);
  expect(
    (
      await request.get('/api/v1/adaptation/me/report.pdf?includeHealthDetails=invalid', {
        headers: user.headers,
      })
    ).status(),
  ).toBe(400);
});
