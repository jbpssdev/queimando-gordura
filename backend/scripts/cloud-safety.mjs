export const allowedDevelopmentProjects = Object.freeze(['queimando-gordura-783e4']);

export function assertCloudTestEnvironment(env = process.env) {
  if (
    !allowedDevelopmentProjects.includes(env.FIREBASE_PROJECT_ID) ||
    env.FIREBASE_ALLOW_CLOUD_TEST !== 'true' ||
    env.FIREBASE_MODE !== 'production' ||
    env.NODE_ENV === 'production' ||
    env.FIREBASE_AUTH_EMULATOR_HOST ||
    env.FIRESTORE_EMULATOR_HOST ||
    !env.FIREBASE_WEB_API_KEY ||
    !(env.FIREBASE_USE_ADC === 'true' || env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    throw new Error(
      'Teste Cloud exige autorização explícita, credenciais, API key pública e projeto DEV permitido: queimando-gordura-783e4; sem emuladores ou NODE_ENV=production.',
    );
  }
}
