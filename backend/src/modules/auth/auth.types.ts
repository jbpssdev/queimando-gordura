export interface AuthenticatedUser {
  readonly uid: string;
  readonly email: string;
  readonly emailVerified: boolean;
}
