import {
  CanActivate,
  ExecutionContext,
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
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.firebaseService.isAvailable()) {
      throw new ServiceUnavailableException(
        'Serviço de autenticação ou persistência indisponível.',
      );
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(
        'Token de autenticação ausente ou mal formatado.',
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]?.trim()) {
      throw new UnauthorizedException(
        'Token de autenticação ausente ou mal formatado.',
      );
    }

    const token = parts[1].trim();

    try {
      const auth = this.firebaseService.getAuth();
      const decodedToken = await auth.verifyIdToken(token);

      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email ?? '',
        emailVerified: Boolean(decodedToken.email_verified),
      };

      return true;
    } catch (error) {
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : 'unknown';
      this.logger.warn(`Falha na validação do token Firebase: ${errorCode}`);
      throw new UnauthorizedException(
        'Token de autenticação inválido ou expirado.',
      );
    }
  }
}
