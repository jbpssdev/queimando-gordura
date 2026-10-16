import type { PublicFirebaseConfig } from '../app/core/firebase.config';

export const environment = {
  production: false,
  firebase: { mode: 'disabled', options: null } satisfies PublicFirebaseConfig,
};
