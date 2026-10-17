import { Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { AdaptationEligibilityService } from './adaptation-eligibility.service.js';
import { AdaptationController } from './adaptation.controller.js';
import { AdaptationService } from './adaptation.service.js';
import { ClockService } from './clock.service.js';
import { AdaptationProgressService } from './services/adaptation-progress.service.js';
import { AdaptationReportPdfService } from './services/adaptation-report-pdf.service.js';

@Module({
  imports: [FirebaseModule, AuthModule, AssessmentModule],
  controllers: [AdaptationController],
  providers: [
    AdaptationService,
    AdaptationEligibilityService,
    AdaptationProgressService,
    AdaptationReportPdfService,
    ClockService,
  ],
  exports: [
    AdaptationService,
    AdaptationEligibilityService,
    AdaptationProgressService,
    AdaptationReportPdfService,
    ClockService,
  ],
})
export class AdaptationModule {}
