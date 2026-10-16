import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UpsertUserProfileDto } from './dto/upsert-user-profile.dto.js';
import type { UserProfileDocument, UserProfileResponse } from './types/user-profile.type.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(FirebaseService) private readonly firebaseService: FirebaseService) {}

  async getProfile(user: AuthenticatedUser): Promise<UserProfileResponse> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const docRef = firestore.collection('users').doc(user.uid);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        throw new NotFoundException('Perfil de usuário não encontrado.');
      }

      const data = snapshot.data() as Partial<UserProfileDocument>;

      return {
        uid: user.uid,
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        email: user.email || (data.email ?? ''),
        emailVerified: user.emailVerified,
        age18Confirmed: Boolean(data.age18Confirmed),
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ServiceUnavailableException) throw error;

      this.logger.error('Erro ao buscar perfil do usuário.');
      throw new ServiceUnavailableException(
        'Serviço de autenticação ou persistência indisponível.',
      );
    }
  }

  async upsertProfile(
    user: AuthenticatedUser,
    dto: UpsertUserProfileDto,
  ): Promise<UserProfileResponse> {
    let emailVerified = user.emailVerified;
    let email = user.email;

    // Se o token não tiver estado verificado ou e-mail, consulta Firebase Auth atualizado
    if (!emailVerified || !email) {
      try {
        const auth = this.firebaseService.getAuth();
        const userRecord = await auth.getUser(user.uid);
        if (userRecord.emailVerified) {
          emailVerified = true;
        }
        if (!email && userRecord.email) {
          email = userRecord.email;
        }
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        this.logger.warn(`Falha não crítica ao consultar Auth para usuário ${user.uid}`);
      }
    }

    try {
      const firestore = this.firebaseService.getFirestore();
      const docRef = firestore.collection('users').doc(user.uid);
      const now = new Date().toISOString();

      const profileResponse = await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);
        let createdAt = now;

        if (snapshot.exists) {
          const existing = snapshot.data() as Partial<UserProfileDocument>;
          if (existing?.createdAt && typeof existing.createdAt === 'string') {
            createdAt = existing.createdAt;
          }
        }

        const documentToPersist: UserProfileDocument = {
          uid: user.uid,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email,
          age18Confirmed: true,
          createdAt,
          updatedAt: now,
        };

        transaction.set(docRef, documentToPersist, { merge: true });

        return {
          ...documentToPersist,
          emailVerified,
        };
      });

      return profileResponse;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;

      this.logger.error('Erro ao salvar perfil do usuário.');
      throw new ServiceUnavailableException(
        'Serviço de autenticação ou persistência indisponível.',
      );
    }
  }
}
