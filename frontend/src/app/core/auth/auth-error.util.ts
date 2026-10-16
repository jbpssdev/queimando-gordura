export function mapFirebaseAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'O formato do e-mail informado não é válido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta cadastrada com este endereço de e-mail.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Utilize pelo menos 6 caracteres.';
    case 'auth/popup-closed-by-user':
      return 'A autenticação com o Google foi cancelada antes da conclusão.';
    case 'auth/popup-blocked':
      return 'A janela de autenticação foi bloqueada pelo navegador. Permita pop-ups e tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique sua conexão e tente novamente.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada temporariamente. Entre em contato com o suporte.';
    case 'auth/requires-recent-login':
      return 'Esta operação exige que você faça login novamente.';
    default:
      if (message.includes('Firebase não está ativo') || message.includes('não está configurada')) {
        return message;
      }
      return 'Não foi possível concluir a operação de autenticação. Verifique os dados e tente novamente.';
  }
}
