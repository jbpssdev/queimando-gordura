import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseService } from '../firebase/firebase.service.js';
import type { AuthenticatedUser } from './auth.types.js';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  private readonly logger = new Logger(VerifiedEmailGuard.name);

  constructor(@Inject(FirebaseService) private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Token de autenticação ausente ou mal formatado.');
    }

    if (user.emailVerified) {
      return true;
    }

    // Se o token reporta e-mail não verificado, verifica diretamente no Firebase Admin
    // para tratar casos em que o usuário confirmou o e-mail após a emissão do token.
    try {
      const auth = this.firebaseService.getAuth();
      const userRecord = await auth.getUser(user.uid);

      if (userRecord.emailVerified) {
        request.user = {
          ...user,
          emailVerified: true,
        };
        return true;
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.warn(`Falha ao consultar estado de verificação de e-mail para ${user.uid}`);
    }

    throw new ForbiddenException(
      'E-mail não verificado. Confirme seu e-mail antes de acessar este recurso.',
    );
  }
}
