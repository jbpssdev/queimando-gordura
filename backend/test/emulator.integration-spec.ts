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
});
