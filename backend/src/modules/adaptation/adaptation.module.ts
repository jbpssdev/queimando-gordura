import { Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { AdaptationEligibilityService } from './adaptation-eligibility.service.js';
import { AdaptationController } from './adaptation.controller.js';
import { AdaptationService } from './adaptation.service.js';
import { ClockService } from './clock.service.js';

@Module({
  imports: [FirebaseModule, AuthModule, AssessmentModule],
  controllers: [AdaptationController],
  providers: [AdaptationService, AdaptationEligibilityService, ClockService],
  exports: [AdaptationService, AdaptationEligibilityService, ClockService],
})
export class AdaptationModule {}
