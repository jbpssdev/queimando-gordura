// Servidor exclusivo de testes: nunca importado pelo bootstrap da aplicação.
import 'reflect-metadata';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../backend/dist/app.module.js';
import { configureApp } from '../../backend/dist/config/configure-app.js';
import { ClockService } from '../../backend/dist/modules/adaptation/clock.service.js';
if (
  process.env.NODE_ENV !== 'test' ||
  process.env.PORT !== '3105' ||
  process.env.FIREBASE_PROJECT_ID !== 'demo-queimando-gordura' ||
  !['emulator', 'disabled'].includes(process.env.FIREBASE_MODE)
)
  throw new Error('Servidor de teste exige demo local e porta isolada.');
if (
  process.env.FIREBASE_MODE === 'emulator' &&
  (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
    process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080')
)
  throw new Error('Hosts devem ser exclusivamente emuladores locais.');
const clockFile = fileURLToPath(new URL('../../.tools/checkpoint6-clock.json', import.meta.url));
const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(ClockService)
  .useValue({
    now: () =>
      existsSync(clockFile)
        ? new Date(JSON.parse(readFileSync(clockFile, 'utf8')).now)
        : new Date(),
  })
  .compile();
const app = module.createNestApplication();
configureApp(app);
await app.listen(3105, '127.0.0.1');
