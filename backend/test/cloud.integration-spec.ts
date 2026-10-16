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
      await request(server)[method]('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
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
});
