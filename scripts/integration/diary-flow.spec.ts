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
  `diary-browser-${randomUUID()}`,
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
      path: `.tools/checkpoint7-evidence/${label}-${width}.png`,
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
test('diário real: catálogo completo, prato, recálculo, água, exercícios, peso e calendário', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const user = await identity(request);
  await seed(request, user.headers);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  expect((await store.collection('foods').get()).size).toBe(597);
  const catalog = await (
    await request.get('/api/v1/foods?limit=1', { headers: user.headers })
  ).json();
  expect(catalog.total).toBe(597);
  expect(catalog.hasMore).toBe(true);
  await login(page, user.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/adaptacao');
  await page.getByRole('button', { name: 'Iniciar meus 30 dias →', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar e Iniciar Meus 30 Dias' }).click();
  await expect(page.getByRole('heading', { name: 'Dia 1 de 30', exact: true })).toBeVisible();
  await page.goto('/diario');
  await expect(page.getByText('Sem registros nesta data.', { exact: false })).toBeVisible();
  const date = await page.getByLabel('Escolher data do diário').inputValue();
  await responsive(page, 'vazio');
  await page.getByRole('button', { name: '+ Adicionar Refeição', exact: true }).click();
  await expect(page.locator('#meal-type-select')).toHaveValue('lunch');
  await page.locator('#meal-title-input').fill('Prato de teste temporário');
  await page.getByPlaceholder('Buscar por nome (ex.: Arroz, Frango, Maçã...)').fill('co');
  await expect(
    page.getByRole('button', { name: 'Carregar mais alimentos', exact: true }),
  ).toBeVisible();
  const nextPage = page.waitForResponse(
    (response) =>
      response.url().includes('/foods?') &&
      new URL(response.url()).searchParams.get('offset') === '20',
  );
  await page.getByRole('button', { name: 'Carregar mais alimentos', exact: true }).click();
  const pageResult = await (await nextPage).json();
  expect(pageResult.items).toHaveLength(20);
  expect(pageResult.offset).toBe(20);

  await searchAndAdd(page, 'Arroz, tipo 1, cozido', '120.25');
  await searchAndAdd(page, 'Feijão, preto, cozido', '1', true);
  await searchAndAdd(page, 'Frango, peito, sem pele, grelhado', '80.5');
  await responsive(page, 'montagem');
  const meal = await saveMeal(page);
  expect(meal.items).toHaveLength(3);
  expect(meal.items[1].weightG).toBe(140);
  const nutrients = ['energyKcal', 'proteinG', 'carbohydrateG', 'fatG', 'fiberG'];
  for (const key of nutrients) {
    const known = meal.items.filter(
      (item: { calculatedNutrients: Record<string, number | null> }) =>
        item.calculatedNutrients[key] !== null,
    );
    const expected = known.reduce(
      (sum: number, item: { nutrientsPer100g: Record<string, number>; weightG: number }) =>
        sum + (item.nutrientsPer100g[key]! * item.weightG) / 100,
      0,
    );
    expect(meal.totals[key].value).toBeCloseTo(expected, 10);
    expect(meal.totals[key].isComplete).toBe(known.length === 3);
  }
  const ref = store.doc(`users/${user.uid}/diary_meals/${meal.id}`);
  expect((await ref.get()).data()?.['totals']).toEqual(meal.totals);
  await expect(page.getByText('Prato de teste temporário', { exact: true })).toBeVisible();
  await responsive(page, 'refeicao');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Quantidade de Arroz, tipo 1, cozido', { exact: true }).fill('150.75');
  await page.getByLabel('Quantidade de Arroz, tipo 1, cozido', { exact: true }).blur();
  const edited = await saveMeal(page, 'PATCH');
  expect(edited.version).toBe(2);
  expect(edited.items[0].weightG).toBe(150.75);
  expect(edited.items[0].nutrientsPer100g).toEqual(meal.items[0].nutrientsPer100g);
  expect(edited.totals.energyKcal.value).toBeCloseTo(
    meal.totals.energyKcal.value + (30.5 * meal.items[0].nutrientsPer100g.energyKcal) / 100,
    10,
  );
  await page.reload();
  await expect(page.getByText('Prato de teste temporário', { exact: true })).toBeVisible();
  expect((await day(request, user.headers, date)).meals[0].totals).toEqual(edited.totals);
  await page.getByRole('button', { name: /^Água \(/ }).click();
  const water = page.waitForResponse(
    (r) => r.url().endsWith('/diary/me/water') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /\+ 250 ml/ }).click();
  expect((await water).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Hidratação / Água' })).toBeVisible();
  await responsive(page, 'agua');
  await page.getByRole('button', { name: /^Atividades \(/ }).click();
  await page.getByRole('button', { name: '+ Adicionar Atividade', exact: true }).click();
  await page.locator('#act-title').fill('Caminhada registrada');
  await page.locator('#act-duration').fill('30');
  await page.locator('#act-intensity').selectOption('light');
  const activity = page.waitForResponse(
    (r) => r.url().endsWith('/diary/me/activities') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Salvar Atividade', exact: true }).click();
  expect((await activity).status()).toBe(201);
  await expect(page.getByText('Caminhada registrada', { exact: true })).toBeVisible();
  await responsive(page, 'atividades');
  await page.getByRole('button', { name: 'Peso Semanal', exact: true }).click();
  await page.locator('#weight-input').fill('74.35');
  const weight = page.waitForResponse(
    (r) => r.url().endsWith('/diary/me/weight') && r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Salvar Peso', exact: true }).click();
  expect((await weight).status()).toBe(200);
  await responsive(page, 'peso');
  const saved = await day(request, user.headers, date);
  expect(saved.water.totalMl).toBe(250);
  expect(saved.activities[0].durationMinutes).toBe(30);
  expect(saved.activities[0].caloriesBurned).toBeUndefined();
  expect(saved.weight.weightKg).toBe(74.35);
  await page.goto('/adaptacao');
  for (const title of [
    'Alimentação registrada',
    'Água registrada',
    'Atividade física registrada',
    'Peso registrado',
  ])
    await expect(page.locator(`[title="${title}"]`)).toHaveCount(1);
  expect(
    (await (await request.get('/api/v1/adaptation/me', { headers: user.headers })).json())
      .calorieTarget,
  ).toBeNull();
  await responsive(page, 'calendario');
  await page.goto('/diario?date=' + date);
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  const removing = page.waitForResponse(
    (r) => r.url().includes('/diary/me/meals/') && r.request().method() === 'DELETE',
  );
  await page.getByRole('button', { name: 'Sim, Excluir', exact: true }).click();
  expect((await removing).status()).toBe(200);
  await expect(page.getByRole('dialog', { name: 'Excluir Refeição?' })).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Prato de teste temporário', exact: true }),
  ).not.toBeVisible();
  const deleted = await day(request, user.headers, date);
  expect(deleted.meals).toEqual([]);
  expect(deleted.nutritionTotals.energyKcal.value).toBeNull();
  const emptyDate = '2026-01-02';
  await page.goto('/diario?date=' + emptyDate);
  await expect(page.getByText('Sem registros nesta data.', { exact: false })).toBeVisible();
  expect((await day(request, user.headers, emptyDate)).nutritionTotals.energyKcal.value).toBeNull();
  const direct = await request.get(
    `http://127.0.0.1:8080/v1/projects/demo-queimando-gordura/databases/(default)/documents/users/${user.uid}/diary_water`,
    { headers: user.headers },
  );
  expect(direct.status()).toBe(403);
  const storage = await page.evaluate(() => Object.values(localStorage).join(' '));
  for (const value of ['Caminhada registrada', 'Prato de teste temporário', '74.35'])
    expect(storage).not.toContain(value);
  expect(errors).toEqual([]);
});
test('diário sem plano: restrição clínica, alimentos privados editáveis e snapshot histórico', async ({
  page,
  request,
}) => {
  test.setTimeout(150000);
  const user = await identity(request);
  await seed(
    request,
    user.headers,
    { ...sections.health, hasNoKnownConditions: false, conditions: ['cardiovascular'] },
    140,
  );
  const preview = await (
    await request.get('/api/v1/adaptation/me/preview', { headers: user.headers })
  ).json();
  expect(preview.modes.standard.available).toBe(false);
  expect(
    (
      await request.post('/api/v1/adaptation/me/start', {
        headers: user.headers,
        data: { mode: 'standard', timeZone: 'UTC' },
      })
    ).status(),
  ).toBe(422);
  await login(page, user.email);
  await expect(page).toHaveURL(/\/painel$/);
  await page.goto('/diario');
  await page.getByRole('button', { name: '+ Adicionar Refeição', exact: true }).click();
  await page.getByRole('button', { name: '+ Criar Alimento Personalizado', exact: true }).click();
  await page.locator('#food-name').fill('Produto temporário do rótulo');
  await page.locator('#food-kcal').fill('123.4567');
  await page.locator('#food-protein').fill('0');
  await page.locator('#food-carb').fill('25.1234');
  await page.locator('#food-fat').fill('2');
  await page.locator('#measure-label').fill('Porção do rótulo');
  await page.locator('#measure-grams').fill('30.25');
  await responsive(page, 'personalizado');
  const createdResponse = page.waitForResponse(
    (r) => r.url().endsWith('/foods/me') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Cadastrar Alimento', exact: true }).click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const food = await created.json();
  await page.locator('#item-unit-select').selectOption('household');
  await page.locator('#item-amount-input').fill('1.5');
  await page
    .getByRole('button', { name: '+ Adicionar este alimento à refeição', exact: true })
    .click();
  const meal = await saveMeal(page);
  expect(meal.items[0].weightG).toBe(45.375);
  expect(meal.totals.proteinG.value).toBe(0);
  expect(meal.totals.fiberG.value).toBeNull();
  expect(meal.totals.fiberG.isComplete).toBe(false);
  await expect(page.getByText('(Parcial)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '+ Adicionar Refeição', exact: true }).click();
  await page
    .getByPlaceholder('Buscar por nome (ex.: Arroz, Frango, Maçã...)')
    .fill('Produto temporário do rótulo');
  await page.getByRole('button').filter({ hasText: 'Produto temporário do rótulo' }).last().click();
  await page.getByRole('button', { name: 'Editar alimento personalizado', exact: true }).click();
  await page.locator('#food-kcal').fill('200');
  const update = page.waitForResponse(
    (r) => r.url().includes('/foods/me/') && r.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Salvar Alimento', exact: true }).click();
  expect((await update).status()).toBe(200);
  const storedMeal = store.doc(`users/${user.uid}/diary_meals/${meal.id}`);
  expect((await storedMeal.get()).data()?.['totals']).toEqual(meal.totals);
  const remove = page.waitForResponse(
    (r) => r.url().includes('/foods/me/') && r.request().method() === 'DELETE',
  );
  await page.getByRole('button', { name: 'Excluir alimento personalizado', exact: true }).click();
  expect((await remove).status()).toBe(200);
  expect((await request.get('/api/v1/foods/' + food.id, { headers: user.headers })).status()).toBe(
    404,
  );
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Quantidade de Produto temporário do rótulo').fill('2');
  await page.getByLabel('Quantidade de Produto temporário do rótulo').blur();
  const changed = await saveMeal(page, 'PATCH');
  expect(changed.items[0].nutrientsPer100g.energyKcal).toBe(123.4567);
  expect(changed.items[0].weightG).toBe(60.5);
  const second = await identity(request);
  expect(
    (await request.get('/api/v1/foods/' + food.id, { headers: second.headers })).status(),
  ).toBe(404);
  const date = meal.date;
  expect((await day(request, second.headers, date)).hasAnyEntries).toBe(false);
  for (const endpoint of ['meals/' + meal.id, 'water/not-owned', 'activities/not-owned'])
    expect(
      (await request.delete('/api/v1/diary/me/' + endpoint, { headers: second.headers })).status(),
    ).toBe(404);
  expect((await request.get('/api/v1/adaptation/me', { headers: user.headers })).status()).toBe(
    404,
  );
  expect((await storedMeal.get()).exists).toBe(true);
});
