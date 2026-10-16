import type { FirebaseOptions } from 'firebase/app';
import { environment } from '../../environments/environment';

export interface PublicFirebaseConfig {
  readonly mode: 'disabled' | 'emulator' | 'production';
  readonly options: FirebaseOptions | null;
  readonly emulatorUrl?: string;
}

export const publicFirebaseConfig: PublicFirebaseConfig = environment.firebase;

