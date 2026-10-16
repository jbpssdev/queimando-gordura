import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './modules/health/health.module.js';
import { FirebaseModule } from './modules/firebase/firebase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AssessmentModule } from './modules/assessment/assessment.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment, envFilePath: '.env' }),
    FirebaseModule,
    AuthModule,
    UsersModule,
    AssessmentModule,
    HealthModule,
  ],
})
export class AppModule {}
