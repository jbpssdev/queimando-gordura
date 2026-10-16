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
});
