import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom, map, of, take } from 'rxjs';
import type { User } from 'firebase/auth';
import { HttpErrorResponse } from '@angular/common/http';
import { FirebaseAuthService } from './firebase-auth.service';
import { UserProfileApiService } from './user-profile-api.service';
import type { CreateOrUpdateUserProfileDto, UserProfile } from './user-profile.model';

export interface SessionState {
  readonly user: User | null;
  readonly profile: UserProfile | null;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly firebaseAuth = inject(FirebaseAuthService);
  private readonly userProfileApi = inject(UserProfileApiService);

  public readonly currentUser = signal<User | null>(null);
  public readonly currentProfile = signal<UserProfile | null>(null);
  public readonly isInitialized = signal<boolean>(false);
  public readonly isProfileLoading = signal<boolean>(false);
  public readonly profileLoadError = signal<number | null>(null);

  public readonly isFirebaseConfigured = computed(() => this.firebaseAuth.isConfigured());
  public readonly isAuthenticated = computed(() => Boolean(this.currentUser()));
  public readonly isEmailVerified = computed(() => {
    const user = this.currentUser();
    return Boolean(user?.emailVerified);
  });

  public readonly hasCompletedProfile = computed(() => {
    const profile = this.currentProfile();
    return Boolean(profile && profile.firstName && profile.age18Confirmed);
  });

  public readonly userDisplayName = computed(() => {
    const profile = this.currentProfile();
    if (profile?.firstName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    const user = this.currentUser();
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      return user.email.split('@')[0] ?? 'Usuário';
    }
    return 'Usuário';
  });

  private readonly isInitialized$ = toObservable(this.isInitialized);

  public initialize(): void {
    this.firebaseAuth.onAuthStateChanged(async (user) => {
      if (user?.uid !== this.currentUser()?.uid) {
        this.isInitialized.set(false);
        this.currentProfile.set(null);
        this.profileLoadError.set(null);
      }
      this.currentUser.set(user);
      if (user && user.emailVerified) {
        await this.loadProfile();
      } else {
        this.currentProfile.set(null);
        this.isInitialized.set(true);
      }
    });
  }

  public async loadProfile(): Promise<UserProfile | null> {
    const uid = this.currentUser()?.uid;
    this.isProfileLoading.set(true);
    this.profileLoadError.set(null);
    try {
      const profile = await firstValueFrom(this.userProfileApi.getProfile());
      if (this.currentUser()?.uid !== uid) return null;
      this.currentProfile.set(profile);
      return profile;
    } catch (error) {
      if (this.currentUser()?.uid !== uid) return null;
      this.currentProfile.set(null);
      if (!(error instanceof HttpErrorResponse && error.status === 404)) {
        this.profileLoadError.set(error instanceof HttpErrorResponse ? error.status : 503);
      }
      return null;
    } finally {
      if (this.currentUser()?.uid === uid) {
        this.isProfileLoading.set(false);
        this.isInitialized.set(true);
      }
    }
  }

  public ensureInitialized() {
    if (this.isInitialized()) {
      return of({
        user: this.currentUser(),
        profile: this.currentProfile(),
      });
    }

    return this.isInitialized$.pipe(
      filter(Boolean),
      take(1),
      map(() => ({
        user: this.currentUser(),
        profile: this.currentProfile(),
      })),
    );
  }

  public async refreshSession(): Promise<SessionState> {
    const user = await this.firebaseAuth.reloadUser();
    this.currentUser.set(user);
    if (user && user.emailVerified) {
      await this.loadProfile();
      const status = this.profileLoadError();
      if (status !== null) throw new HttpErrorResponse({ status });
    } else {
      this.currentProfile.set(null);
    }
    return {
      user: this.currentUser(),
      profile: this.currentProfile(),
    };
  }

  public async saveProfile(dto: CreateOrUpdateUserProfileDto): Promise<UserProfile> {
    const saved = await firstValueFrom(this.userProfileApi.saveProfile(dto));
    this.currentProfile.set(saved);
    return saved;
  }

  public async signOut(): Promise<void> {
    await this.firebaseAuth.signOut();
    this.currentUser.set(null);
    this.currentProfile.set(null);
    this.profileLoadError.set(null);
  }

  public getIdToken(forceRefresh = false): Promise<string | null> {
    return this.firebaseAuth.getIdToken(forceRefresh);
  }
}
