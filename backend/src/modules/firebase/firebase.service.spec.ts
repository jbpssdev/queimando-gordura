import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { FirebaseService } from './firebase.service.js';

describe('FirebaseService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('permanece desativado quando FIREBASE_MODE=disabled', () => {
    const configService = {
      get: vi.fn().mockReturnValue('disabled'),
      getOrThrow: vi.fn(),
    } as unknown as ConfigService;

    const service = new FirebaseService(configService);
    expect(service.isAvailable()).toBe(false);
    expect(service.getMode()).toBe('disabled');
    expect(() => service.getAuth()).toThrow(ServiceUnavailableException);
    expect(() => service.getFirestore()).toThrow(ServiceUnavailableException);
  });

  it('inicializa emuladores quando FIREBASE_MODE=emulator', () => {
    const configMap: Record<string, string> = {
      FIREBASE_MODE: 'emulator',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_PROJECT_ID: 'demo-queimando-gordura',
    };
    const configService = {
      get: vi.fn((key: string, defaultVal?: unknown) => configMap[key] ?? defaultVal),
      getOrThrow: vi.fn((key: string) => {
        if (!configMap[key]) throw new Error(`Missing ${key}`);
        return configMap[key];
      }),
    } as unknown as ConfigService;

    const service = new FirebaseService(configService);
    expect(service.isAvailable()).toBe(true);
    expect(service.getMode()).toBe('emulator');
    expect(service.getAuth()).toBeDefined();
    expect(service.getFirestore()).toBeDefined();
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBe('127.0.0.1:9099');
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
  });

  it('encerra aplicação Firebase em onApplicationShutdown', async () => {
    const configMap: Record<string, string> = {
      FIREBASE_MODE: 'emulator',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_PROJECT_ID: 'demo-queimando-gordura',
    };
    const configService = {
      get: vi.fn((key: string, defaultVal?: unknown) => configMap[key] ?? defaultVal),
      getOrThrow: vi.fn((key: string) => configMap[key]!),
    } as unknown as ConfigService;

    const service = new FirebaseService(configService);
    expect(service.isAvailable()).toBe(true);
    await service.onApplicationShutdown();
    expect(service.isAvailable()).toBe(false);
  });

  it('em modo production/nuvem, remove variáveis de emulador e inicializa com ADC', () => {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

    const configMap: Record<string, string> = {
      FIREBASE_MODE: 'production',
      FIREBASE_PROJECT_ID: 'queimando-gordura-dev',
    };
    const configService = {
      get: vi.fn((key: string, defaultVal?: unknown) => configMap[key] ?? defaultVal),
      getOrThrow: vi.fn((key: string) => {
        if (!configMap[key]) throw new Error(`Missing ${key}`);
        return configMap[key];
      }),
    } as unknown as ConfigService;

    const service = new FirebaseService(configService);
    expect(service.isAvailable()).toBe(true);
    expect(service.getMode()).toBe('production');
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBeUndefined();
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeUndefined();
  });
});
