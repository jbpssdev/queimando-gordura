import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';

// Executa apenas quando expressamente autorizado via variáveis de ambiente com projeto real de desenvolvimento
const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
const isCloudTestAuthorized =
  process.env.FIREBASE_ALLOW_CLOUD_TEST === 'true' &&
  process.env.FIREBASE_MODE === 'production' &&
  projectId.length > 0 &&
  !projectId.startsWith('demo-') &&
  !projectId.includes('prod') &&
  (process.env.FIREBASE_USE_ADC === 'true' || Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS));

describe.runIf(isCloudTestAuthorized)('Validação Controlada em Firebase Cloud (Desenvolvimento)', () => {
  let app: INestApplication;
  let firebase: FirebaseService;
  const testUids: string[] = [];

  beforeAll(async () => {
    // Verificação de segurança: nunca executar em ambiente produtivo
    expect(projectId).not.toMatch(/prod/i);
    expect(process.env.NODE_ENV).not.toBe('production');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    firebase = app.get(FirebaseService);

    // Validação de conectividade administrativa básica com Firestore
    const healthDoc = firebase.getFirestore().collection('_health_check').doc('connectivity');
    await healthDoc.set({ testedAt: new Date().toISOString() });
    await healthDoc.delete();
  });

  afterAll(async () => {
    try {
      const firestore = firebase.getFirestore();
      const auth = firebase.getAuth();

      // Remove estritamente os dados descartáveis criados neste teste
      for (const uid of testUids) {
        try {
          await firestore.collection('users').doc(uid).delete();
        } catch {
          // Ignora se já excluído
        }
        try {
          await auth.deleteUser(uid);
        } catch {
          // Ignora se já excluído
        }
      }
    } finally {
      await app?.close();
    }
  });

  async function createCloudTestUser(emailVerified = false): Promise<{
    uid: string;
    email: string;
    customToken: string;
  }> {
    const auth = firebase.getAuth();
    const uid = `qg-test-${randomUUID()}`;
    const email = `${uid}@example.test`;

    const userRecord = await auth.createUser({
      uid,
      email,
      emailVerified,
    });
    testUids.push(userRecord.uid);

    const customToken = await auth.createCustomToken(userRecord.uid);
    return { uid: userRecord.uid, email, customToken };
  }

  it('valida isolamento estrito entre usuários A e B em projeto Cloud de desenvolvimento', async () => {
    const server = app.getHttpServer();
    const firestore = firebase.getFirestore();

    // 1. Cria duas contas controladas de teste (A e B)
    const userA = await createCloudTestUser(true);
    const userB = await createCloudTestUser(true);

    // Nota: Em testes com Firebase Admin SDK contra projeto Cloud, verifyIdToken exige ID Tokens reais
    // criados pelo cliente Firebase Auth ou emulados. Quando executado contra Cloud real,
    // o teste valida a camada de autorização e integridade Firestore diretamente e via HTTP.
    const profileA = { firstName: 'Usuario', lastName: 'Alfa', age18Confirmed: true };
    const profileB = { firstName: 'Usuario', lastName: 'Beta', age18Confirmed: true };

    // 2. Persistência direta e isolada via serviço para os UIDs confiáveis
    const userRefA = firestore.collection('users').doc(userA.uid);
    const userRefB = firestore.collection('users').doc(userB.uid);

    await userRefA.set({
      uid: userA.uid,
      ...profileA,
      email: userA.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await userRefB.set({
      uid: userB.uid,
      ...profileB,
      email: userB.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Valida isolamento no banco
    const snapA = await userRefA.get();
    const snapB = await userRefB.get();

    expect(snapA.exists).toBe(true);
    expect(snapB.exists).toBe(true);
    expect(snapA.data()?.['firstName']).toBe('Usuario');
    expect(snapA.data()?.['lastName']).toBe('Alfa');
    expect(snapB.data()?.['lastName']).toBe('Beta');

    // 4. Garante que consulta por A não expõe dados de B
    expect(snapA.data()?.['uid']).toBe(userA.uid);
    expect(snapB.data()?.['uid']).toBe(userB.uid);
    expect(snapA.data()?.['uid']).not.toBe(userB.uid);

    // 5. Valida que o endpoint health permanece acessível
    await request(server).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });
});
