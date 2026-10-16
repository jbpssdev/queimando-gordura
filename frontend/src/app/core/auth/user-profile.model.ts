export interface UserProfile {
  readonly uid: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly age18Confirmed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateOrUpdateUserProfileDto {
  readonly firstName: string;
  readonly lastName: string;
  readonly age18Confirmed: boolean;
}
