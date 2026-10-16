import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';
import { VerifiedEmailGuard } from './verified-email.guard.js';

@Module({
  imports: [FirebaseModule],
  providers: [FirebaseAuthGuard, VerifiedEmailGuard],
  exports: [FirebaseAuthGuard, VerifiedEmailGuard, FirebaseModule],
})
export class AuthModule {}
