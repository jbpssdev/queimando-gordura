export function mapFirebaseAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if ('status' in error) {
    switch (error.status) {
      case 401:
        return 'Sua sessão não foi autorizada. Saia e entre novamente.';
      case 403:
        return 'Confirme seu e-mail antes de acessar este recurso.';
      case 404:
        return 'Seu perfil ainda não foi encontrado. Complete seus dados.';
      case 0:
      case 503:
        return 'Não foi possível consultar seu perfil. O servidor está indisponível; tente novamente.';
    }
  }
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
      return 'A janela de autenticação foi bloqueada pelo navegador. Permita pop-ups ou utilize o login por redirecionamento.';
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado para autenticação com o Google no Firebase Console.';
    case 'auth/cancelled-popup-request':
      return 'A solicitação de login com Google foi cancelada.';
    case 'auth/credential-already-in-use':
      return 'Esta credencial do Google já está vinculada a outra conta.';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta cadastrada com este e-mail através de outro método de login.';
    case 'auth/operation-not-allowed':
      return 'Este método de login não está ativado no Firebase Console.';
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
