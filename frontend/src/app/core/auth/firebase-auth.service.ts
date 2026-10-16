import { Injectable } from '@angular/core';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  type Auth,
  type User,
  type UserCredential,
  type Unsubscribe,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { publicFirebaseConfig } from '../firebase.config';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private emulatorConnected = false;

  constructor() {
    this.initFirebase();
  }

  public isConfigured(): boolean {
    return this.auth !== null;
  }

  private hasValidConfiguration(): boolean {
    const options = publicFirebaseConfig.options;
    if (!options?.apiKey || !options.projectId) return false;
    if (publicFirebaseConfig.mode === 'emulator') {
      return (
        !environment.production &&
        options.projectId.startsWith('demo-') &&
        ['http://127.0.0.1:9099', 'http://localhost:9099'].includes(
          publicFirebaseConfig.emulatorUrl ?? 'http://localhost:9099',
        )
      );
    }
    return (
      publicFirebaseConfig.mode === 'production' &&
      !options.projectId.startsWith('demo-') &&
      Boolean(options.authDomain && options.appId)
    );
  }

  public get currentUser(): User | null {
    return this.auth ? this.auth.currentUser : null;
  }

  public onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    if (!this.auth) {
      callback(null);
      return () => undefined;
    }
    return onAuthStateChanged(this.auth, callback);
  }

  public async signInWithEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserCredential> {
    const auth = this.requireAuth();
    return signInWithEmailAndPassword(auth, email.trim(), password);
  }

  public async createUserWithEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserCredential> {
    const auth = this.requireAuth();
    return createUserWithEmailAndPassword(auth, email.trim(), password);
  }

  public async signInWithGoogle(): Promise<UserCredential> {
    const auth = this.requireAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  }

  public async signInWithGoogleRedirect(): Promise<void> {
    const auth = this.requireAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);
  }

  public async getRedirectResult(): Promise<UserCredential | null> {
    if (!this.auth) {
      return null;
    }
    return getRedirectResult(this.auth);
  }


  public async updateDisplayName(displayName: string): Promise<void> {
    const user = this.requireCurrentUser();
    await updateProfile(user, { displayName: displayName.trim() });
  }

  public async sendEmailVerification(): Promise<void> {
    const user = this.requireCurrentUser();
    await sendEmailVerification(user);
  }

  public async sendPasswordResetEmail(email: string): Promise<void> {
    const auth = this.requireAuth();
    await sendPasswordResetEmail(auth, email.trim());
  }

  public async reloadUser(): Promise<User | null> {
    const user = this.auth?.currentUser;
    if (!user) {
      return null;
    }
    await user.reload();
    await user.getIdToken(true);
    return this.auth?.currentUser ?? null;
  }

  public async signOut(): Promise<void> {
    if (!this.auth) {
      return;
    }
    await signOut(this.auth);
  }

  public async getIdToken(forceRefresh = false): Promise<string | null> {
    const user = this.auth?.currentUser;
    if (!user) {
      return null;
    }
    return user.getIdToken(forceRefresh);
  }

  private initFirebase(): void {
    if (!this.hasValidConfiguration() || !publicFirebaseConfig.options) {
      return;
    }

    try {
      this.app = getApps().length === 0 ? initializeApp(publicFirebaseConfig.options) : getApp();
      this.auth = getAuth(this.app);

      if (
        !environment.production &&
        publicFirebaseConfig.mode === 'emulator' &&
        !this.emulatorConnected
      ) {
        const emulatorUrl = publicFirebaseConfig.emulatorUrl ?? 'http://localhost:9099';
        connectAuthEmulator(this.auth, emulatorUrl, { disableWarnings: true });
        this.emulatorConnected = true;
      }
    } catch {
      this.app = null;
      this.auth = null;
    }
  }

  private requireAuth(): Auth {
    if (!this.auth) {
      throw new Error('A autenticação com Firebase ainda não está configurada neste ambiente.');
    }
    return this.auth;
  }

  private requireCurrentUser(): User {
    const user = this.auth?.currentUser;
    if (!user) {
      throw new Error('Nenhum usuário autenticado no Firebase.');
    }
    return user;
  }
}
