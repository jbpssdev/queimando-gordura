import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { initializeApp, deleteApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, applyActionCode } from 'firebase/auth';
import type { User } from 'firebase/auth';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';

const allowedDevelopmentProjects = ['queimando-gordura-783e4'] as const;
const authorized = process.env.FIREBASE_ALLOW_CLOUD_TEST === 'true';
const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
if (
  authorized &&
  (!allowedDevelopmentProjects.some((allowed) => allowed === projectId) ||
    process.env.FIREBASE_MODE !== 'production' ||
    process.env.NODE_ENV === 'production' ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_WEB_API_KEY)
)
  throw new Error('Teste Cloud recusado: projeto fora da lista DEV ou ambiente inválido.');

describe.runIf(authorized)('Firebase Cloud DEV: tokens reais, API e isolamento', () => {
  let app: INestApplication | undefined;
  let firebase: FirebaseService;
  let client: FirebaseApp | undefined;
  const owned: { uid: string; document: boolean }[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    firebase = app.get(FirebaseService);
    // Read-only preflight; never overwrite a fixed diagnostic document.
    await firebase.getFirestore().doc(`users/qg-preflight-${randomUUID()}`).get();
    client = initializeApp(
      { projectId, apiKey: process.env.FIREBASE_WEB_API_KEY },
      `cloud-test-${randomUUID()}`,
    );
  }, 30000);

  afterAll(async () => {
    const failures: string[] = [];
    for (const resource of owned) {
      try {
        if (resource.document) {
          const reference = firebase.getFirestore().doc(`users/${resource.uid}`);
          const assessment = reference.collection('assessments').doc('initial');
          for (const doc of (await assessment.collection('results').get()).docs)
            await doc.ref.delete();
          await assessment.delete();
          for (const name of [
            'adaptations',
            'customFoods',
            'diary_meals',
            'diary_water',
            'diary_activities',
            'diary_weights',
          ]) {
            for (const doc of (await reference.collection(name).get()).docs) await doc.ref.delete();
            expect((await reference.collection(name).get()).empty).toBe(true);
          }
          await reference.delete();
          expect((await reference.get()).exists).toBe(false);
        }
      } catch {
        failures.push(`document:${resource.uid}`);
      }
      try {
        await firebase.getAuth().deleteUser(resource.uid);
        await expect(firebase.getAuth().getUser(resource.uid)).rejects.toMatchObject({
          code: 'auth/user-not-found',
        });
      } catch {
        failures.push(`identity:${resource.uid}`);
      }
    }
    if (client) await deleteApp(client);
    await app?.close();
    expect(failures, 'Recursos temporários cuja limpeza precisa ser repetida').toEqual([]);
  }, 60000);

  async function register(): Promise<User> {
    const credential = await createUserWithEmailAndPassword(
      getAuth(client!),
      `qg-cloud-${randomUUID()}@example.test`,
      randomUUID() + 'aA1!',
    );
    const resource = { uid: credential.user.uid, document: false };
    owned.push(resource);
    const existing = await firebase.getFirestore().doc(`users/${resource.uid}`).get();
    expect(existing.exists).toBe(false);
    resource.document = true;
    return credential.user;
  }

  async function verifyEmail(user: User): Promise<string> {
    // Official action link and client action-code flow; no emailVerified bypass.
    const link = await firebase.getAuth().generateEmailVerificationLink(user.email!);
    await applyActionCode(getAuth(client!), new URL(link).searchParams.get('oobCode')!);
    await user.reload();
    const token = await user.getIdToken(true);
    expect((await firebase.getAuth().verifyIdToken(token)).email_verified).toBe(true);
    return token;
  }

  it('cadastra, persiste pela API, confirma e-mail, isola contas e nega Firestore direto', async () => {
    const server = app!.getHttpServer();
    await request(server).get('/api/v1/health').expect(200).expect({ status: 'ok' });
    for (const method of ['get', 'put'] as const) {
      await request(server)[method]('/api/v1/users/me').expect(401);
      const invalid = request(server)[method]('/api/v1/users/me');
      await invalid.set('Authorization', 'Bearer invalid-token').expect(401);
    }
    const first = await register();
    const initialToken = await first.getIdToken();
    const claims = await firebase.getAuth().verifyIdToken(initialToken);
    expect(claims.uid).toBe(first.uid);
    expect(claims.email_verified).toBe(false);
    const profile = { firstName: 'Teste', lastName: 'Cloud', age18Confirmed: true };
    const created = await request(server)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${initialToken}`)
      .send(profile)
      .expect(200);
    expect(created.body).toMatchObject({ ...profile, uid: first.uid, email: first.email });
    const reference = firebase.getFirestore().doc(`users/${first.uid}`);
    expect((await reference.get()).data()).toMatchObject({ ...profile, uid: first.uid });
    await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${initialToken}`)
      .expect(403);
    const firstToken = await verifyEmail(first);
    const loaded = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${firstToken}`)
      .expect(200);
    expect(loaded.body).toMatchObject({ ...profile, uid: first.uid, emailVerified: true });
    const second = await register();
    const secondToken = await verifyEmail(second);
    await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(404);
    await request(server)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ ...profile, uid: first.uid })
      .expect(400);
    await request(server)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ ...profile, firstName: 'Outra' })
      .expect(200);
    const secondLoaded = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(200);
    expect(secondLoaded.body.uid).toBe(second.uid);
    expect(secondLoaded.body.firstName).toBe('Outra');
    expect((await reference.get()).data()?.['firstName']).toBe('Teste');
    const directUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${first.uid}`;
    for (const token of [undefined, firstToken, secondToken]) {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      expect((await fetch(directUrl, { headers })).status).toBe(403);
    }
    const directWrite = await fetch(directUrl, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${firstToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { firstName: { stringValue: 'Denied' } } }),
    });
    expect(directWrite.status).toBe(403);
    expect((await reference.get()).data()?.['firstName']).toBe('Teste');
  }, 120000);
  it('diário e progresso reais Cloud DEV: catálogo, snapshots, recarga, privacidade e limpeza própria', async () => {
    const server = app!.getHttpServer();
    const person = await register();
    const token = await verifyEmail(person);
    const headers = { Authorization: `Bearer ${token}` };
    await request(server)
      .put('/api/v1/users/me')
      .set(headers)
      .send({ firstName: 'Teste', lastName: 'Diário Cloud', age18Confirmed: true })
      .expect(200);
    const sections = {
      body: {
        dateOfBirth: '1990-05-15',
        sexForMetabolicFormula: 'male',
        heightCm: 175,
        weightKg: 75,
        scaleType: 'standard',
      },
      health: {
        conditions: [],
        hasNoKnownConditions: true,
        isConditionUnknown: false,
        symptoms: [],
      },
      routine: {
        workPattern: 'sedentary',
        sittingHoursPerDay: 8,
        dailyMovementLevel: 'low',
        strengthTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' },
        cardioTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' },
      },
      nutrition: {
        mealsPerDay: 3,
        mealRegularity: 'regular',
        hasKitchenScale: true,
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
    for (const [section, data] of Object.entries(sections))
      await request(server)
        .patch('/api/v1/assessments/me')
        .set(headers)
        .send({ section, data })
        .expect(200);
    await request(server).post('/api/v1/assessments/me/evaluate').set(headers).expect(201);
    const started = await request(server)
      .post('/api/v1/adaptation/me/start')
      .set(headers)
      .send({ mode: 'standard', timeZone: 'America/Sao_Paulo' })
      .expect(201);
    const date = started.body.startLocalDate;
    expect(started.body.calorieTarget).toBeNull();
    let total = 0,
      foodsWithMeasures = 0,
      equivalents = 0;
    for (let offset = 0; offset < 597; offset += 100) {
      const result = await request(server)
        .get(`/api/v1/foods?limit=100&offset=${offset}`)
        .set(headers)
        .expect(200);
      total = result.body.total;
      for (const food of result.body.items) {
        if (food.householdMeasures?.length) {
          foodsWithMeasures++;
          equivalents += food.householdMeasures.length;
        }
      }
    }
    expect({ total, foodsWithMeasures, equivalents }).toEqual({
      total: 597,
      foodsWithMeasures: 3,
      equivalents: 9,
    });
    const meal = await request(server)
      .post('/api/v1/diary/me/meals')
      .set(headers)
      .send({
        date,
        mealType: 'lunch',
        clientRequestId: randomUUID(),
        items: [
          { foodId: 'taco_3', amount: 125.5, unit: 'g' },
          { foodId: 'taco_567', amount: 1, unit: 'household', householdMeasureId: 'concha_media' },
        ],
      })
      .expect(201);
    expect(meal.body.items[1].weightG).toBe(140);
    await request(server)
      .post('/api/v1/diary/me/water')
      .set(headers)
      .send({ date, amountMl: 250, clientRequestId: randomUUID() })
      .expect(201);
    await request(server)
      .post('/api/v1/diary/me/activities')
      .set(headers)
      .send({
        date,
        type: 'cardio',
        description: 'Caminhada temporária',
        durationMinutes: 30,
        intensity: 'light',
        clientRequestId: randomUUID(),
      })
      .expect(201);
    await request(server)
      .put('/api/v1/diary/me/weight')
      .set(headers)
      .send({ date, weightKg: 74.75 })
      .expect(200);
    const custom = await request(server)
      .post('/api/v1/foods/me')
      .set(headers)
      .send({
        name: 'Rótulo temporário Cloud',
        source: 'Teste controlado de rótulo, sem catálogo público',
        nutrientsPer100g: {
          energyKcal: 100,
          proteinG: 0,
          carbohydrateG: 20,
          fatG: 1,
          fiberG: null,
        },
      })
      .expect(201);
    const day = await request(server)
      .get('/api/v1/diary/me?date=' + date)
      .set(headers)
      .expect(200);
    expect(day.body.water.totalMl).toBe(250);
    expect(day.body.weight.weightKg).toBe(74.75);
    expect(day.body.activities).toHaveLength(1);
    const stored = await firebase
      .getFirestore()
      .doc(`users/${person.uid}/diary_meals/${meal.body.id}`)
      .get();
    expect(stored.data()?.['totals']).toEqual(meal.body.totals);
    const progress = await request(server)
      .get('/api/v1/adaptation/me/progress')
      .set(headers)
      .expect(200);
    expect(progress.body.participation).toEqual({
      distinctDaysRecorded: 1,
      daysWithMeals: 1,
      daysWithWater: 1,
      daysWithActivities: 1,
      daysWithWeight: 1,
    });
    expect(progress.body.weightEvolution.measurements[0].weightKg).toBe(74.75);
    expect(progress.body.weightEvolution.weightDeltaKg).toBeNull();
    expect(progress.body.achievements.unlocked).toHaveLength(4);
    expect(progress.body.reportAvailable).toBe(false);
    await request(server).get('/api/v1/adaptation/me/report.pdf').set(headers).expect(422);
    const reloaded = await request(server)
      .get('/api/v1/adaptation/me/progress')
      .set(headers)
      .expect(200);
    expect(reloaded.body).toEqual(progress.body);
    const other = await register();
    const otherToken = await verifyEmail(other);
    const second = { Authorization: `Bearer ${otherToken}` };
    await request(server).get('/api/v1/adaptation/me/progress').set(second).expect(404);
    await request(server)
      .get('/api/v1/foods/' + custom.body.id)
      .set(second)
      .expect(404);
    const empty = await request(server)
      .get('/api/v1/diary/me?date=' + date)
      .set(second)
      .expect(200);
    expect(empty.body.hasAnyEntries).toBe(false);
    await request(server)
      .delete('/api/v1/diary/me/meals/' + meal.body.id)
      .set(second)
      .expect(404);
    const direct = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${person.uid}/diary_meals/${meal.body.id}`,
      { headers },
    );
    expect(direct.status).toBe(403);
    console.log(
      'Cloud DEV: diário/progresso persistidos e recarregados; catálogo597, alimentos com medidas3, equivalências9.',
    );
  }, 120000);
});
