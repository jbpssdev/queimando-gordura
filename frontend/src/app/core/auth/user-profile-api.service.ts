import { timeout } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { CreateOrUpdateUserProfileDto, UserProfile } from './user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/v1/users/me';

  public getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.endpoint).pipe(timeout(10000));
  }

  public saveProfile(dto: CreateOrUpdateUserProfileDto): Observable<UserProfile> {
    return this.http.put<UserProfile>(this.endpoint, dto).pipe(timeout(10000));
  }
}
