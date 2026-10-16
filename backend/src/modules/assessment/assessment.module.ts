import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { AssessmentCalculatorService } from './assessment-calculator.service.js';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [AssessmentController],
  providers: [AssessmentService, AssessmentCalculatorService],
  exports: [AssessmentService, AssessmentCalculatorService],
})
export class AssessmentModule {}
