import type { PublicFirebaseConfig } from '../app/core/firebase.config';

export const environment = {
  production: false,
  firebase: {
    mode: 'emulator',
    options: {
      apiKey: 'demo-emulator-key',
      authDomain: 'demo-queimando-gordura.firebaseapp.com',
      projectId: 'demo-queimando-gordura',
      appId: 'demo-queimando-gordura-web',
    },
    emulatorUrl: 'http://127.0.0.1:9099',
  } satisfies PublicFirebaseConfig,
};
