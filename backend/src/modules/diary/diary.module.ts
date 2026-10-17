import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { FoodsModule } from '../foods/foods.module.js';
import { DiaryCalculatorService } from './diary-calculator.service.js';
import { DiaryController } from './diary.controller.js';
import { DiaryService } from './diary.service.js';

@Module({
  imports: [FirebaseModule, FoodsModule],
  controllers: [DiaryController],
  providers: [DiaryService, DiaryCalculatorService],
  exports: [DiaryService, DiaryCalculatorService],
})
export class DiaryModule {}
