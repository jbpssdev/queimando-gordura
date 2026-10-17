import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { FoodsController } from './foods.controller.js';
import { FoodsService } from './foods.service.js';

@Module({
  imports: [FirebaseModule],
  controllers: [FoodsController],
  providers: [FoodsService],
  exports: [FoodsService],
})
export class FoodsModule {}
