import type { PublicFirebaseConfig } from '../app/core/firebase.config';

// Configuração pública consultada pelo Firebase MCP. Exclusiva do projeto DEV.
export const environment = {
  production: false,
  firebase: {
    mode: 'production',
    options: {
      apiKey: 'AIzaSyDdUYbPa5o7pw0m_dWp5bsyXxE0DOBw4nk',
      authDomain: 'queimando-gordura-783e4.firebaseapp.com',
      projectId: 'queimando-gordura-783e4',
      appId: '1:643848467484:web:f95de017eaf5ca0fa45bd9',
      messagingSenderId: '643848467484',
    },
  } satisfies PublicFirebaseConfig,
};
