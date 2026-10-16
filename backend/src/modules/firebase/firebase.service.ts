import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  applicationDefault,
  initializeApp,
  getApps,
  getApp,
  deleteApp,
  cert,
} from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Auth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnApplicationShutdown {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;
  private auth: Auth | null = null;
  private firestore: Firestore | null = null;
  private readonly mode: 'disabled' | 'emulator' | 'production';

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.mode = this.configService.get<string>('FIREBASE_MODE', 'disabled') as
      | 'disabled'
      | 'emulator'
      | 'production';
    this.init();
  }

  private init(): void {
    if (this.mode === 'disabled') {
      this.logger.log('Firebase em modo desativado (FIREBASE_MODE=disabled).');
      return;
    }

    if (this.mode === 'emulator') {
      const authHost = this.configService.getOrThrow<string>('FIREBASE_AUTH_EMULATOR_HOST');
      const firestoreHost = this.configService.getOrThrow<string>('FIRESTORE_EMULATOR_HOST');
      const projectId = this.configService.getOrThrow<string>('FIREBASE_PROJECT_ID');

      process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
      process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;

      const existingApps = getApps();
      this.app = existingApps.length > 0 ? getApp() : initializeApp({ projectId });
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
      this.logger.log(`Firebase Admin inicializado com emuladores (projeto: ${projectId}).`);
      return;
    }

    if (this.mode === 'production') {
      // Previne conexão acidental a emuladores em modo cloud/produção
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      delete process.env.FIRESTORE_EMULATOR_HOST;

      const projectId = this.configService.getOrThrow<string>('FIREBASE_PROJECT_ID');
      const credentialsPath = this.configService.get<string>(
        'GOOGLE_APPLICATION_CREDENTIALS',
      );

      const existingApps = getApps();
      const credential =
        credentialsPath && isAbsolute(credentialsPath) && existsSync(credentialsPath)
          ? cert(credentialsPath)
          : applicationDefault();

      this.app =
        existingApps.length > 0
          ? getApp()
          : initializeApp({
              credential,
              projectId,
            });

      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
      const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
      this.logger.log(
        `Firebase Admin conectado ao Cloud (${nodeEnv === 'production' ? 'produção' : 'desenvolvimento'}, projeto: ${projectId}).`,
      );
    }
  }

  isAvailable(): boolean {
    return (
      this.mode !== 'disabled' && this.app !== null && this.auth !== null && this.firestore !== null
    );
  }

  getMode(): 'disabled' | 'emulator' | 'production' {
    return this.mode;
  }

  getAuth(): Auth {
    if (!this.isAvailable() || !this.auth) {
      throw new ServiceUnavailableException(
        'Serviço de autenticação ou persistência indisponível.',
      );
    }
    return this.auth;
  }

  getFirestore(): Firestore {
    if (!this.isAvailable() || !this.firestore) {
      throw new ServiceUnavailableException(
        'Serviço de autenticação ou persistência indisponível.',
      );
    }
    return this.firestore;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.app) {
      try {
        await deleteApp(this.app);
      } catch (error) {
        this.logger.warn(
          `Falha ao encerrar aplicação Firebase Admin: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      this.app = null;
      this.auth = null;
      this.firestore = null;
    }
  }
}
