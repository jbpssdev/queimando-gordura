import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './modules/health/health.module.js';
import { FirebaseModule } from './modules/firebase/firebase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AssessmentModule } from './modules/assessment/assessment.module.js';
import { AdaptationModule } from './modules/adaptation/adaptation.module.js';
import { FoodsModule } from './modules/foods/foods.module.js';
import { DiaryModule } from './modules/diary/diary.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment, envFilePath: '.env' }),
    FirebaseModule,
    AuthModule,
    UsersModule,
    AssessmentModule,
    AdaptationModule,
    FoodsModule,
    DiaryModule,
    HealthModule,
  ],
})
export class AppModule {}
