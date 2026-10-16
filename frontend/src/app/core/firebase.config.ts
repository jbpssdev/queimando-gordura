import type { FirebaseOptions } from 'firebase/app';
import { environment } from '../../environments/environment';

export interface PublicFirebaseConfig {
  readonly mode: 'disabled' | 'emulator' | 'production';
  readonly options: FirebaseOptions | null;
}

// Apenas configuração pública. A inicialização e autenticação pertencem ao próximo checkpoint.
export const publicFirebaseConfig: PublicFirebaseConfig = environment.firebase;
