import 'reflect-metadata';
import { describe, beforeAll, afterAll, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';
import type { UserProfileDocument } from '../src/modules/users/types/user-profile.type.js';

describe('Users & Auth (e2e)', () => {
  let app: INestApplication;
  const inMemoryFirestore = new Map<string, UserProfileDocument>();

  const mockAuth = {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-verified-token') {
        return {
          uid: 'user-verified-123',
          email: 'ana@example.com',
          email_verified: true,
        };
      }
      if (token === 'valid-unverified-token') {
        return {
          uid: 'user-unverified-456',
          email: 'pedro@example.com',
          email_verified: false,
        };
      }
      if (token === 'another-user-token') {
        return {
          uid: 'user-another-789',
          email: 'carlos@example.com',
          email_verified: true,
        };
      }
      throw new Error('Firebase ID token is invalid or expired');
    }),
    getUser: vi.fn(async (uid: string) => {
      if (uid === 'user-verified-123') {
        return { uid, email: 'ana@example.com', emailVerified: true };
      }
      if (uid === 'user-unverified-456') {
        return { uid, email: 'pedro@example.com', emailVerified: false };
      }
      throw new Error('User not found');
    }),
  };

  const mockFirestore = {
    collection: vi.fn((colName: string) => {
      if (colName !== 'users') throw new Error(`Unknown collection ${colName}`);
      return {
        doc: vi.fn((docId: string) => ({
          id: docId,
          get: vi.fn(async () => {
            const data = inMemoryFirestore.get(docId);
            return {
              exists: Boolean(data),
              data: () => data,
            };
          }),
        })),
      };
    }),
    runTransaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: vi.fn(async (docRef: { id: string }) => {
          const data = inMemoryFirestore.get(docRef.id);
          return {
            exists: Boolean(data),
            data: () => data,
          };
        }),
        set: vi.fn(
          (docRef: { id: string }, data: UserProfileDocument, options?: { merge?: boolean }) => {
            if (options?.merge && inMemoryFirestore.has(docRef.id)) {
              const current = inMemoryFirestore.get(docRef.id)!;
              inMemoryFirestore.set(docRef.id, { ...current, ...data });
            } else {
              inMemoryFirestore.set(docRef.id, data);
            }
          },
        ),
      };
      return callback(tx);
    }),
  };

  let mockIsAvailable = true;
  const mockFirebaseService = {
    isAvailable: vi.fn(() => mockIsAvailable),
    getAuth: vi.fn(() => {
      if (!mockIsAvailable) throw new Error('Unavailable');
      return mockAuth;
    }),
    getFirestore: vi.fn(() => {
      if (!mockIsAvailable) throw new Error('Unavailable');
      return mockFirestore;
    }),
    onApplicationShutdown: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseService)
      .useValue(mockFirebaseService)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PUT /api/v1/users/me', () => {
    it('retorna 401 quando o cabeçalho Authorization estiver ausente', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .send({ firstName: 'Ana', lastName: 'Silva', age18Confirmed: true })
        .expect(401);

      expect(response.body.message).toBe('Token de autenticação ausente ou mal formatado.');
    });

    it('retorna 401 quando o token for inválido ou expirado', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .send({ firstName: 'Ana', lastName: 'Silva', age18Confirmed: true })
        .expect(401);

      expect(response.body.message).toBe('Token de autenticação inválido ou expirado.');
    });

    it('retorna 400 quando campos obrigatórios estiverem ausentes', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({ lastName: 'Silva', age18Confirmed: true })
        .expect(400);

      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({ firstName: 'Ana', age18Confirmed: true })
        .expect(400);
    });

    it('retorna 400 quando o nome for composto apenas de espaços vazios', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({ firstName: '   ', lastName: 'Silva', age18Confirmed: true })
        .expect(400);
    });

    it('retorna 400 quando age18Confirmed for false', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({ firstName: 'Ana', lastName: 'Silva', age18Confirmed: false })
        .expect(400);

      expect(JSON.stringify(response.body)).toContain('maioridade');
    });

    it('retorna 400 e rejeita campos proibidos enviados pelo cliente', async () => {
      // Rejeita tentativas de injetar role, uid ou dados de saúde
      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          firstName: 'Ana',
          lastName: 'Silva',
          age18Confirmed: true,
          role: 'admin',
        })
        .expect(400);

      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          firstName: 'Ana',
          lastName: 'Silva',
          age18Confirmed: true,
          uid: 'malicious-uid',
        })
        .expect(400);

      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          firstName: 'Ana',
          lastName: 'Silva',
          age18Confirmed: true,
          weight: 70,
        })
        .expect(400);
    });

    it('permite criação de perfil para token válido mesmo com e-mail não verificado', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-unverified-token')
        .send({ firstName: 'Pedro', lastName: 'Santos', age18Confirmed: true })
        .expect(200);

      expect(response.body).toMatchObject({
        uid: 'user-unverified-456',
        firstName: 'Pedro',
        lastName: 'Santos',
        email: 'pedro@example.com',
        emailVerified: false,
        age18Confirmed: true,
      });
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('cria e depois atualiza de forma idempotente, preservando createdAt', async () => {
      // Primeira requisição: criação
      const createRes = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({ firstName: 'Ana', lastName: 'Silva', age18Confirmed: true })
        .expect(200);

      const initialCreatedAt = createRes.body.createdAt;
      expect(initialCreatedAt).toBeDefined();
      expect(createRes.body.firstName).toBe('Ana');

      // Segunda requisição: atualização do sobrenome
      const updateRes = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({ firstName: 'Ana', lastName: 'Oliveira', age18Confirmed: true })
        .expect(200);

      expect(updateRes.body.createdAt).toBe(initialCreatedAt);
      expect(updateRes.body.lastName).toBe('Oliveira');
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('retorna 401 sem autenticação', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('retorna 403 quando o usuário autenticado não confirmou o e-mail', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-unverified-token')
        .expect(403);

      expect(response.body.message).toContain('E-mail não verificado');
    });

    it('retorna 404 quando o usuário possui e-mail confirmado mas não possui perfil criado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer another-user-token')
        .expect(404);

      expect(response.body.message).toBe('Perfil de usuário não encontrado.');
    });

    it('retorna 200 com os dados do perfil quando autenticado e verificado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(200);

      expect(response.body).toMatchObject({
        uid: 'user-verified-123',
        firstName: 'Ana',
        lastName: 'Oliveira',
        email: 'ana@example.com',
        emailVerified: true,
        age18Confirmed: true,
      });
    });

    it('não permite ler o perfil de outro usuário via query string ou parâmetro', async () => {
      // Mesmo passando query params tentando personificar outro usuário, retorna o do token
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me?uid=user-unverified-456&userId=other')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(200);

      expect(response.body.uid).toBe('user-verified-123');
    });
  });

  describe('Isolamento e Controle de Acesso entre Usuários A e B', () => {
    it('garante que usuário A e usuário B acessem estritamente seus próprios dados e impede personificação', async () => {
      // 1. Usuário B (Carlos) cria seu perfil
      const resB = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer another-user-token')
        .send({ firstName: 'Carlos', lastName: 'Santos', age18Confirmed: true })
        .expect(200);

      expect(resB.body.uid).toBe('user-another-789');
      expect(resB.body.firstName).toBe('Carlos');

      // 2. Consulta de Usuário A retorna estritamente os dados de A
      const getA = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(200);

      expect(getA.body.uid).toBe('user-verified-123');
      expect(getA.body.firstName).toBe('Ana');

      // 3. Consulta de Usuário B retorna estritamente os dados de B
      const getB = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer another-user-token')
        .expect(200);

      expect(getB.body.uid).toBe('user-another-789');
      expect(getB.body.firstName).toBe('Carlos');

      // 4. Usuário A tenta injetar o UID de B no corpo da requisição PUT -> deve ser rejeitado com 400
      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          uid: 'user-another-789',
          firstName: 'Ana',
          lastName: 'Hacker',
          age18Confirmed: true,
        })
        .expect(400);

      // 5. Confirma que os dados de Usuário B permaneceram inalterados no Firestore
      const verifyB = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer another-user-token')
        .expect(200);

      expect(verifyB.body.firstName).toBe('Carlos');
      expect(verifyB.body.lastName).toBe('Santos');

      // 6. Usuário A tenta ler dados de B usando query string -> API retorna dados de A
      const spoofA = await request(app.getHttpServer())
        .get('/api/v1/users/me?uid=user-another-789')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(200);

      expect(spoofA.body.uid).toBe('user-verified-123');
      expect(spoofA.body.firstName).toBe('Ana');

      // 7. Usuário B tenta ler dados de A usando query string -> API retorna dados de B
      const spoofB = await request(app.getHttpServer())
        .get('/api/v1/users/me?uid=user-verified-123')
        .set('Authorization', 'Bearer another-user-token')
        .expect(200);

      expect(spoofB.body.uid).toBe('user-another-789');
      expect(spoofB.body.firstName).toBe('Carlos');
    });
  });

  describe('Indisponibilidade do Firebase', () => {
    it('retorna 503 quando Firebase estiver desativado/indisponível para rotas privadas', async () => {
      mockIsAvailable = false;

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(503);

      expect(response.body.message).toBe('Serviço de autenticação ou persistência indisponível.');

      mockIsAvailable = true;
    });

    it('preserva o endpoint /health funcionando em 200 mesmo quando Firebase estiver indisponível', async () => {
      mockIsAvailable = false;

      await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });

      mockIsAvailable = true;
    });
  });
});
