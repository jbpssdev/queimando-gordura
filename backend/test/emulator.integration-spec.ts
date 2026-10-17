import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';

const projectId = 'demo-queimando-gordura';
const isEmulatorRunning =
  process.env.FIREBASE_MODE === 'emulator' &&
  process.env.FIREBASE_PROJECT_ID === projectId &&
  process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099' &&
  process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080';

interface Identity {
  localId: string;
  idToken: string;
  refreshToken: string;
  email: string;
}

describe.runIf(isEmulatorRunning)('Integração Real com Firebase Emulator Suite', () => {
  let app: INestApplication;
  let firebase: FirebaseService;
  const ownedUids: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    firebase = app.get(FirebaseService);
  });

  afterAll(async () => {
    try {
      for (const uid of ownedUids) {
        const reference = firebase.getFirestore().collection('users').doc(uid);
        const assessDoc = reference.collection('assessments').doc('initial');
        const ownedResults = await assessDoc.collection('results').get();
        for (const result of ownedResults.docs) await result.ref.delete();
        expect((await assessDoc.collection('results').get()).empty).toBe(true);
        await assessDoc.delete();
        const adaptDoc = reference.collection('adaptations').doc('initial');
        await adaptDoc.delete();
        for (const name of [
          'customFoods',
          'diary_meals',
          'diary_water',
          'diary_activities',
          'diary_weights',
        ]) {
          const entries = await reference.collection(name).get();
          for (const entry of entries.docs) await entry.ref.delete();
          expect((await reference.collection(name).get()).empty).toBe(true);
        }
        await reference.delete();
        await firebase.getAuth().deleteUser(uid);
        expect((await reference.get()).exists).toBe(false);
        await expect(firebase.getAuth().getUser(uid)).rejects.toMatchObject({
          code: 'auth/user-not-found',
        });
      }
    } finally {
      await app?.close();
    }
  });

  async function createIdentity(): Promise<Identity> {
    const email = 'qg-integration-' + randomUUID() + '@example.test';
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-emulator-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: randomUUID(), returnSecureToken: true }),
      },
    );
    expect(response.ok).toBe(true);
    const identity = (await response.json()) as Identity;
    ownedUids.push(identity.localId);
    return { ...identity, email };
  }

  async function confirmAndRefresh(identity: Identity): Promise<string> {
    await firebase.getAuth().updateUser(identity.localId, { emailVerified: true });
    const response = await fetch(
      'http://127.0.0.1:9099/securetoken.googleapis.com/v1/token?key=demo-emulator-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: identity.refreshToken,
        }),
      },
    );
    expect(response.ok).toBe(true);
    const data = (await response.json()) as { id_token: string };
    expect((await firebase.getAuth().verifyIdToken(data.id_token)).email_verified).toBe(true);
    return data.id_token;
  }

  it('persiste perfis, renova tokens, restringe e-mail não confirmado e isola usuários reais', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/v1/health').expect(200).expect({ status: 'ok' });
    for (const method of ['get', 'put'] as const) {
      await request(server)[method]('/api/v1/users/me').expect(401);
      const invalid = request(server)[method]('/api/v1/users/me');
      await invalid.set('Authorization', 'Bearer invalid-token').expect(401);
    }
    const first = await createIdentity();
    const firstClaims = await firebase.getAuth().verifyIdToken(first.idToken);
    expect(firstClaims.uid).toBe(first.localId);
    expect(firstClaims.email_verified).toBe(false);
    const profile = { firstName: 'Emulado', lastName: 'Teste', age18Confirmed: true };
    const created = await request(server)
      .put('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + first.idToken)
      .send(profile)
      .expect(200);
    expect(created.body).toMatchObject({
      ...profile,
      uid: first.localId,
      email: first.email,
      emailVerified: false,
    });
    const reference = firebase.getFirestore().collection('users').doc(first.localId);
    expect((await reference.get()).data()).toMatchObject({ ...profile, uid: first.localId });
    await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + first.idToken)
      .expect(403);
    const firstToken = await confirmAndRefresh(first);
    const loaded = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + firstToken)
      .expect(200);
    expect(loaded.body).toMatchObject({
      ...profile,
      uid: first.localId,
      email: first.email,
      emailVerified: true,
    });
    const updated = await request(server)
      .put('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + firstToken)
      .send({ ...profile, lastName: 'Atualizado' })
      .expect(200);
    expect(updated.body.createdAt).toBe(created.body.createdAt);
    const second = await createIdentity();
    const secondToken = await confirmAndRefresh(second);
    await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + secondToken)
      .expect(404);
    await request(server)
      .put('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + secondToken)
      .send({ ...profile, uid: first.localId })
      .expect(400);
    await request(server)
      .put('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + secondToken)
      .send({ ...profile, firstName: 'Outro' })
      .expect(200);
    const secondLoaded = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer ' + secondToken)
      .expect(200);
    expect(secondLoaded.body.uid).toBe(second.localId);
    expect(secondLoaded.body.firstName).toBe('Outro');
    expect((await reference.get()).data()?.['lastName']).toBe('Atualizado');
    expect((await reference.get()).data()?.['firstName']).toBe('Emulado');
    await request(server)
      .get('/api/v1/users/' + first.localId)
      .set('Authorization', 'Bearer ' + secondToken)
      .expect(404);
  }, 30000);

  it('persiste avaliação real, calcula métricas, isola subcoleções e bloqueia acesso cruzado no Firestore Emulator', async () => {
    const server = app.getHttpServer();
    const userA = await createIdentity();
    const tokenA = await confirmAndRefresh(userA);

    // GET /assessments/me antes de criar retorna 404
    await request(server)
      .get('/api/v1/assessments/me')
      .set('Authorization', 'Bearer ' + tokenA)
      .expect(404);

    // Preenche seção body
    const bodyRes = await request(server)
      .patch('/api/v1/assessments/me')
      .set('Authorization', 'Bearer ' + tokenA)
      .send({
        section: 'body',
        data: {
          dateOfBirth: '1990-05-15',
          sexForMetabolicFormula: 'male',
          heightCm: 180,
          weightKg: 85,
          targetWeightKg: 78,
          scaleType: 'standard',
        },
      })
      .expect(200);

    expect(bodyRes.body.revision).toBe(1);
    expect(bodyRes.body.status).toBe('draft');

    // Preenche seção health
    await request(server)
      .patch('/api/v1/assessments/me')
      .set('Authorization', 'Bearer ' + tokenA)
      .send({
        section: 'health',
        data: {
          conditions: [],
          hasNoKnownConditions: true,
          isConditionUnknown: false,
          symptoms: ['none'],
        },
      })
      .expect(200);

    // Preenche seção routine
    await request(server)
      .patch('/api/v1/assessments/me')
      .set('Authorization', 'Bearer ' + tokenA)
      .send({
        section: 'routine',
        data: {
          workPattern: 'sedentary',
          sittingHoursPerDay: 8,
          dailyMovementLevel: 'low',
          strengthTraining: {
            frequencyDaysPerWeek: 3,
            durationMinutes: 45,
            intensity: 'moderate',
          },
          cardioTraining: {
            frequencyDaysPerWeek: 2,
            durationMinutes: 30,
            intensity: 'light',
          },
        },
      })
      .expect(200);

    // Preenche seção nutrition
    await request(server)
      .patch('/api/v1/assessments/me')
      .set('Authorization', 'Bearer ' + tokenA)
      .send({
        section: 'nutrition',
        data: {
          mealsPerDay: 3,
          mealRegularity: 'regular',
          hasKitchenScale: true,
          sweetenedDrinksFrequency: 'never',
          alcoholFrequency: 'never',
          budgetConstrained: false,
          dietaryPreferences: ['omnivore'],
          allergies: [],
          intolerances: [],
          dietaryRestrictions: [],
          mealSources: ['home_cooked'],
          weightLossChallenges: [],
        },
      })
      .expect(200);

    // Avalia e consolida resultados
    const evalRes = await request(server)
      .post('/api/v1/assessments/me/evaluate')
      .set('Authorization', 'Bearer ' + tokenA)
      .expect(201);

    expect(evalRes.body.revision).toBe(4);
    expect(evalRes.body.bmi.value).toBe(26.2);
    expect(evalRes.body.bmr.calculated).toBe(true);
    expect(evalRes.body.safety.status).toBe('cleared');

    // Verifica persistência real no Firestore Emulator
    const assessDocRef = firebase
      .getFirestore()
      .collection('users')
      .doc(userA.localId)
      .collection('assessments')
      .doc('initial');

    const snap = await assessDocRef.get();
    expect(snap.exists).toBe(true);
    expect(snap.data()?.['status']).toBe('completed');
    expect(snap.data()?.['revision']).toBe(4);

    const resultSnap = await assessDocRef.collection('results').doc('current').get();
    expect(resultSnap.exists).toBe(true);
    expect(resultSnap.data()?.['bmi']?.['value']).toBe(26.2);

    // Usuário B não acessa a avaliação do Usuário A
    const userB = await createIdentity();
    const tokenB = await confirmAndRefresh(userB);

    await request(server)
      .get('/api/v1/assessments/me')
      .set('Authorization', 'Bearer ' + tokenB)
      .expect(404);

    await request(server)
      .get('/api/v1/assessments/me/results')
      .set('Authorization', 'Bearer ' + tokenB)
      .expect(404);
  }, 30000);
  it('valida cenários clínicos, pendências, tokens expirados e concorrência em persistência real', async () => {
    const person = await createIdentity();
    const token = await confirmAndRefresh(person);
    const server = app.getHttpServer();
    const sections = {
      body: {
        dateOfBirth: '1990-05-15',
        sexForMetabolicFormula: 'male',
        heightCm: 175.53,
        weightKg: 82.73,
        scaleType: 'standard',
      },
      health: {
        hasNoKnownConditions: false,
        isConditionUnknown: true,
        conditions: [],
        symptoms: [],
      },
      routine: {
        workPattern: 'sedentary',
        sittingHoursPerDay: 12,
        dailyMovementLevel: 'low',
        strengthTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' },
        cardioTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' },
      },
      nutrition: {
        mealsPerDay: 3,
        mealRegularity: 'regular',
        hasKitchenScale: false,
        sweetenedDrinksFrequency: 'rarely',
        alcoholFrequency: 'never',
        budgetConstrained: false,
      },
    };
    const patch = (section: string, data: object) =>
      request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ section, data });
    const evaluate = () =>
      request(server)
        .post('/api/v1/assessments/me/evaluate')
        .set('Authorization', `Bearer ${token}`);
    await patch('body', sections.body).expect(200);
    const incomplete = await evaluate().expect(422);
    expect(
      incomplete.body.pendingItems.some((p: { section: string }) => p.section === 'health'),
    ).toBe(true);
    for (const section of ['health', 'routine', 'nutrition'] as const)
      await patch(section, sections[section]).expect(200);
    const unknown = await evaluate().expect(201);
    expect(unknown.body.safety.requiresProfessionalClearance).toBe(true);
    expect(unknown.body.safety.allowsAutomaticCaloricDeficit).toBe(false);
    expect(unknown.body.tdee.exerciseAddonKcal).toBe(0);
    await patch('health', { symptoms: ['chest_pain'] }).expect(200);
    expect((await evaluate().expect(201)).body.safety.isEmergency).toBe(true);
    await patch('health', {
      symptoms: [],
      isConditionUnknown: false,
      hasNoKnownConditions: true,
    }).expect(200);
    // A partial PATCH cannot leave conflicting declaration flags in the stored section.
    await patch('health', { isConditionUnknown: true }).expect(400);
    await patch('body', { weightKg: 140 }).expect(200);
    const obesity = await evaluate().expect(201);
    expect(obesity.body.bmi.category).toBe('obesity_3');
    expect(obesity.body.safety.requiresProfessionalClearance).toBe(true);
    await patch('body', { sexForMetabolicFormula: 'unavailable' }).expect(200);
    const unavailable = await evaluate().expect(201);
    expect(unavailable.body.bmr.bmrKcal).toBeNull();
    expect(unavailable.body.tdee.estimatedTdeeKcal).toBeNull();
    const concurrent = await Promise.all([evaluate().expect(201), evaluate().expect(201)]);
    expect(concurrent[0]!.body.calculatedAt).toBe(concurrent[1]!.body.calculatedAt);
    const reference = firebase.getFirestore().doc(`users/${person.localId}/assessments/initial`);
    const historical = await reference
      .collection('results')
      .doc(`rev_${unknown.body.revision}`)
      .get();
    expect(historical.data()?.['bmi']).toEqual(unknown.body.bmi);
    const direct = await fetch(
      `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users/${person.localId}/assessments/initial`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(direct.status).toBe(403);
    const parts = token.split('.');
    const expiredClaims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()) as Record<
      string,
      unknown
    >;
    expiredClaims['exp'] = Math.floor(Date.now() / 1000) - 3600;
    const expired = `${parts[0]}.${Buffer.from(JSON.stringify(expiredClaims)).toString('base64url')}.`;
    await request(server)
      .get('/api/v1/assessments/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  }, 30000);

  it('persiste plano de adaptação de 30 dias, valida elegibilidade, isola usuários e bloqueia acesso direto no Firestore Emulator', async () => {
    const server = app.getHttpServer();
    const person = await createIdentity();
    const token = await confirmAndRefresh(person);

    // 1. Cria perfil e avaliação completa
    await request(server)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Adapt', lastName: 'User', age18Confirmed: true })
      .expect(200);

    const sections = {
      body: {
        dateOfBirth: '1992-05-10',
        sexForMetabolicFormula: 'male' as const,
        heightCm: 175,
        weightKg: 75,
        scaleType: 'standard' as const,
      },
      health: {
        conditions: [],
        hasNoKnownConditions: true,
        isConditionUnknown: false,
        symptoms: ['none'],
      },
      routine: {
        workPattern: 'sedentary' as const,
        sittingHoursPerDay: 8,
        dailyMovementLevel: 'low' as const,
        strengthTraining: {
          frequencyDaysPerWeek: 3,
          durationMinutes: 45,
          intensity: 'moderate' as const,
        },
        cardioTraining: {
          frequencyDaysPerWeek: 2,
          durationMinutes: 30,
          intensity: 'light' as const,
        },
      },
      nutrition: {
        mealsPerDay: 3,
        mealRegularity: 'regular' as const,
        hasKitchenScale: true,
        sweetenedDrinksFrequency: 'never' as const,
        alcoholFrequency: 'never' as const,
        budgetConstrained: false,
        dietaryPreferences: ['omnivore'],
        allergies: [],
        intolerances: [],
        dietaryRestrictions: [],
        mealSources: ['home_cooked'],
        weightLossChallenges: [],
      },
    };

    for (const section of ['body', 'health', 'routine', 'nutrition'] as const) {
      await request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ section, data: sections[section] })
        .expect(200);
    }

    await request(server)
      .post('/api/v1/assessments/me/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    // 2. Consulta prévia da adaptação
    const previewRes = await request(server)
      .get('/api/v1/adaptation/me/preview')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(previewRes.body.recommendedMode).toBe('standard');
    expect(previewRes.body.modes.standard.available).toBe(true);
    expect(previewRes.body.modes.intensified.available).toBe(false);
    expect(previewRes.body.calorieTargetAvailable).toBe(false);

    // 3. Inicia o plano de 30 dias (201 Created)
    const startRes = await request(server)
      .post('/api/v1/adaptation/me/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'standard', timeZone: 'America/Recife' })
      .expect(201);

    expect(startRes.body.id).toBe('initial');
    expect(startRes.body.mode).toBe('standard');
    expect(startRes.body.status).toBe('active');
    expect(startRes.body.currentDay).toBe(1);
    expect(startRes.body.elapsedDays).toBe(0);
    expect(startRes.body.remainingDays).toBe(30);
    expect(startRes.body.calendarProgressPercent).toBe(0);
    expect(startRes.body.calendar).toHaveLength(30);
    expect(startRes.body.calorieTarget).toBeNull();

    // 4. Verifica persistência real no Firestore Emulator
    const adaptDocRef = firebase.getFirestore().doc(`users/${person.localId}/adaptations/initial`);

    const snap = await adaptDocRef.get();
    expect(snap.exists).toBe(true);
    expect(snap.data()?.['mode']).toBe('standard');
    expect(snap.data()?.['status']).toBe('active');
    expect(snap.data()?.['timeZone']).toBe('America/Recife');

    // 5. Bloqueio de acesso cliente direto ao documento de adaptação no Firestore
    const directAccess = await fetch(
      `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users/${person.localId}/adaptations/initial`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(directAccess.status).toBe(403);

    // 6. Repetição idempotente da mesma solicitação (200 OK)
    const repeatRes = await request(server)
      .post('/api/v1/adaptation/me/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'standard', timeZone: 'America/Recife' })
      .expect(200);

    expect(repeatRes.body.startedAt).toBe(startRes.body.startedAt);

    // 7. Tentativa de reiniciar ou alterar fuso produz 409
    await request(server)
      .post('/api/v1/adaptation/me/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'standard', timeZone: 'Europe/London' })
      .expect(409);

    // 8. Consulta do plano (GET /me)
    const getRes = await request(server)
      .get('/api/v1/adaptation/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getRes.body.id).toBe('initial');
    expect(getRes.body.status).toBe('active');
    expect(getRes.body.calendar[0].temporalState).toBe('today');

    // 9. Segundo usuário não acessa o plano do primeiro (404)
    const otherPerson = await createIdentity();
    const otherToken = await confirmAndRefresh(otherPerson);

    await request(server)
      .get('/api/v1/adaptation/me')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  }, 30000);

  it('gerencia catálogo alimentar oficial, alimentos próprios e diário completo com persistência no Firestore Emulator', async () => {
    const server = app.getHttpServer();
    const person = await createIdentity();
    const token = await confirmAndRefresh(person);

    // 1. Consulta catálogo oficial (busca por "arroz" em português)
    const searchRes = await request(server)
      .get('/api/v1/foods?query=arroz')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(searchRes.body.items.length).toBeGreaterThan(0);
    const cookedRice = searchRes.body.items.find((i: { id: string }) => i.id === 'taco_1');
    expect(cookedRice).toBeDefined();
    expect(cookedRice.preparation).toBe('cozido');

    // 2. Cria alimento personalizado no Firestore Emulator
    const customFoodRes = await request(server)
      .post('/api/v1/foods/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Whey Protein Isolado',
        preparation: 'em pó',
        category: 'Suplementos',
        nutrientsPer100g: {
          energyKcal: 370,
          proteinG: 80,
          carbohydrateG: 4,
          fatG: 2,
          fiberG: 0,
        },
        householdMeasures: [{ id: 'scoop', label: '1 scoop', grams: 30 }],
      })
      .expect(201);

    const customFoodId = customFoodRes.body.id;
    expect(customFoodId).toMatch(/^custom_/);

    // 3. Registra refeição mista (arroz TACO com medida caseira + whey personalizado)
    const mealRes = await request(server)
      .post('/api/v1/diary/me/meals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-10-16',
        mealType: 'lunch',
        title: 'Almoço com Proteína',
        items: [
          {
            foodId: 'taco_1',
            amount: 2,
            unit: 'household',
            householdMeasureId: 'colher_sopa', // IBGE: 2 * 20g = 40g
          },
          {
            foodId: customFoodId,
            amount: 1,
            unit: 'household',
            householdMeasureId: 'scoop', // 1 * 30g = 30g
          },
        ],
        clientRequestId: 'meal-lunch-integration',
      })
      .expect(201);

    expect(mealRes.body.items).toHaveLength(2);
    expect(mealRes.body.items[0].weightG).toBe(40);
    expect(mealRes.body.items[1].weightG).toBe(30);
    // (2.59 * 0.5 = 1.30) + (80 * 0.3 = 24.0) = 25.30
    expect(mealRes.body.totals.proteinG.value).toBeCloseTo(25.0353, 8);

    // 4. Registra água
    await request(server)
      .post('/api/v1/diary/me/water')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-10-16', amountMl: 600 })
      .expect(201);

    // 5. Registra atividade física (verificando que NÃO fabrica calorias)
    const actRes = await request(server)
      .post('/api/v1/diary/me/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-10-16',
        type: 'cardio',
        description: 'Bicicleta ergométrica',
        durationMinutes: 30,
        intensity: 'moderate',
      })
      .expect(201);

    expect(actRes.body.durationMinutes).toBe(30);
    expect(actRes.body.caloriesBurned).toBeUndefined();

    // 6. Registra pesagem semanal
    await request(server)
      .put('/api/v1/diary/me/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-10-16', weightKg: 81.4 })
      .expect(200);

    // 7. Consulta visão do dia (/api/v1/diary/me?date=2026-10-16)
    const dayRes = await request(server)
      .get('/api/v1/diary/me?date=2026-10-16')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dayRes.body.hasAnyEntries).toBe(true);
    expect(dayRes.body.nutritionTotals.hasEntries).toBe(true);
    expect(dayRes.body.meals).toHaveLength(1);
    expect(dayRes.body.water.totalMl).toBe(600);
    expect(dayRes.body.activities).toHaveLength(1);
    expect(dayRes.body.weight?.weightKg).toBe(81.4);

    // 8. Consulta resumo para o calendário (/api/v1/diary/me/summary)
    const summaryRes = await request(server)
      .get('/api/v1/diary/me/summary?from=2026-10-16&to=2026-10-18')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(summaryRes.body.items).toHaveLength(3);
    const day16 = summaryRes.body.items[0];
    expect(day16.hasMealEntries).toBe(true);
    expect(day16.hasWaterEntries).toBe(true);
    expect(day16.hasActivities).toBe(true);
    expect(day16.hasWeightEntry).toBe(true);

    // 9. Isolamento: outro usuário não acessa diário ou alimento personalizado do primeiro
    const otherPerson = await createIdentity();
    const otherToken = await confirmAndRefresh(otherPerson);

    await request(server)
      .get(`/api/v1/foods/${customFoodId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const otherDayRes = await request(server)
      .get('/api/v1/diary/me?date=2026-10-16')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    expect(otherDayRes.body.hasAnyEntries).toBe(false);
    expect(otherDayRes.body.nutritionTotals.hasEntries).toBe(false);
    expect(otherDayRes.body.meals).toHaveLength(0);
  }, 30000);
  it('transações reais impedem duplicação e perda de revisões em refeições, água e atividades', async () => {
    const server = app.getHttpServer();
    const person = await createIdentity();
    await request(server)
      .get('/api/v1/diary/me?date=2026-10-17')
      .set('Authorization', `Bearer ${person.idToken}`)
      .expect(403);
    const token = await confirmAndRefresh(person);
    const headers = { Authorization: `Bearer ${token}` };
    const payload = {
      date: '2026-10-17',
      mealType: 'lunch',
      items: [{ foodId: 'taco_3', amount: 123.45, unit: 'g' }],
      clientRequestId: 'concurrent-meal',
    };
    const create = () =>
      request(server).post('/api/v1/diary/me/meals').set(headers).send(payload).expect(201);
    const [a, b] = await Promise.all([create(), create()]);
    expect(a.body.id).toBe(b.body.id);
    const ref = firebase.getFirestore().doc(`users/${person.localId}/diary_meals/${a.body.id}`);
    expect((await ref.parent.get()).size).toBe(1);
    await request(server)
      .post('/api/v1/diary/me/meals')
      .set(headers)
      .send({ ...payload, title: 'outro conteúdo' })
      .expect(409);
    const changes = await Promise.all(
      ['primeira', 'segunda'].map((title) =>
        request(server)
          .patch(`/api/v1/diary/me/meals/${a.body.id}`)
          .set(headers)
          .send({ title, version: 1 }),
      ),
    );
    expect(changes.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await ref.get()).data()?.['version']).toBe(2);
    const water = () =>
      request(server)
        .post('/api/v1/diary/me/water')
        .set(headers)
        .send({ date: payload.date, amountMl: 250, clientRequestId: 'concurrent-water' })
        .expect(201);
    const waters = await Promise.all([water(), water()]);
    expect(waters[0]!.body.id).toBe(waters[1]!.body.id);
    const activity = () =>
      request(server)
        .post('/api/v1/diary/me/activities')
        .set(headers)
        .send({
          date: payload.date,
          type: 'cardio',
          description: 'Registro temporário',
          durationMinutes: 30,
          intensity: 'light',
          clientRequestId: 'concurrent-activity',
        })
        .expect(201);
    const activities = await Promise.all([activity(), activity()]);
    expect(activities[0]!.body.id).toBe(activities[1]!.body.id);
    const day = await request(server)
      .get(`/api/v1/diary/me?date=${payload.date}`)
      .set(headers)
      .expect(200);
    expect(day.body.water.totalMl).toBe(250);
    expect(day.body.activities).toHaveLength(1);
    for (const invalid of [
      { date: '2026-02-30', mealType: 'lunch', items: payload.items },
      { ...payload, items: [{ foodId: 'taco_3', amount: 10001, unit: 'g' }] },
    ]) {
      await request(server).post('/api/v1/diary/me/meals').set(headers).send(invalid).expect(400);
    }
    await request(server).get('/api/v1/foods?limit=101').set(headers).expect(400);
    await request(server).get('/api/v1/foods?offset=10001').set(headers).expect(400);
    for (const endpoint of ['/api/v1/foods', '/api/v1/diary/me?date=2026-10-17']) {
      await request(server).get(endpoint).expect(401);
      await request(server).get(endpoint).set('Authorization', 'Bearer invalid-token').expect(401);
    }
  }, 30000);
});
