import 'reflect-metadata';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';

const isEmulatorRunning =
  process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9099' &&
  process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8080';

describe.runIf(isEmulatorRunning)('Integração Real com Firebase Emulator Suite', () => {
  let app: INestApplication;
  let firebaseService: FirebaseService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    firebaseService = app.get(FirebaseService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function getIdTokenForUid(uid: string, email: string): Promise<string> {
    const auth = firebaseService.getAuth();
    try {
      await auth.deleteUser(uid);
    } catch {
      // Ignora se não existir
    }
    await auth.createUser({
      uid,
      email,
      emailVerified: false,
    });

    const customToken = await auth.createCustomToken(uid);

    const res = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-emulator-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      },
    );

    const data = (await res.json()) as { idToken: string };
    return data.idToken;
  }

  it('cria e atualiza perfil real no Firestore Emulator e valida controle de acesso', async () => {
    const testUid = `test-user-${Date.now()}`;
    const testEmail = `${testUid}@example.com`;
    const idToken = await getIdTokenForUid(testUid, testEmail);

    // 1. Cria perfil através de PUT /api/v1/users/me (permitido com e-mail não verificado)
    const createRes = await request(app.getHttpServer())
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${idToken}`)
      .send({ firstName: 'Emulado', lastName: 'Teste', age18Confirmed: true })
      .expect(200);

    expect(createRes.body).toMatchObject({
      uid: testUid,
      firstName: 'Emulado',
      lastName: 'Teste',
      email: testEmail,
      emailVerified: false,
      age18Confirmed: true,
    });
    expect(createRes.body.createdAt).toBeDefined();

    // 2. Consulta GET /api/v1/users/me deve retornar 403 porque o e-mail não foi confirmado
    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${idToken}`)
      .expect(403);

    // 3. Simula verificação de e-mail no Firebase Auth
    const auth = firebaseService.getAuth();
    await auth.updateUser(testUid, { emailVerified: true });

    // 4. Agora a consulta GET /api/v1/users/me deve ser autorizada (200)
    const getRes = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${idToken}`)
      .expect(200);

    expect(getRes.body).toMatchObject({
      uid: testUid,
      firstName: 'Emulado',
      lastName: 'Teste',
      email: testEmail,
      emailVerified: true,
      age18Confirmed: true,
    });

    // 5. Atualização de perfil deve preservar createdAt original
    const updateRes = await request(app.getHttpServer())
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${idToken}`)
      .send({ firstName: 'Emulado', lastName: 'Atualizado', age18Confirmed: true })
      .expect(200);

    expect(updateRes.body.createdAt).toBe(createRes.body.createdAt);
    expect(updateRes.body.lastName).toBe('Atualizado');

    // 6. Limpeza
    await auth.deleteUser(testUid);
    const firestore = firebaseService.getFirestore();
    await firestore.collection('users').doc(testUid).delete();
  });
});
