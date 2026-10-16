import { describe, expect, it, vi } from 'vitest';
import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UpsertUserProfileDto } from './dto/upsert-user-profile.dto.js';

describe('UsersController', () => {
  it('upsertProfile delega para UsersService com o usuário autenticado', async () => {
    const mockUsersService = {
      upsertProfile: vi.fn().mockResolvedValue({
        uid: 'user-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        emailVerified: false,
        age18Confirmed: true,
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:00:00.000Z',
      }),
    } as unknown as UsersService;

    const controller = new UsersController(mockUsersService);
    const user: AuthenticatedUser = {
      uid: 'user-1',
      email: 'ana@example.com',
      emailVerified: false,
    };
    const dto: UpsertUserProfileDto = {
      firstName: 'Ana',
      lastName: 'Silva',
      age18Confirmed: true,
    };

    const response = await controller.upsertProfile(user, dto);

    expect(mockUsersService.upsertProfile).toHaveBeenCalledWith(user, dto);
    expect(response.uid).toBe('user-1');
  });

  it('getProfile delega para UsersService com o usuário autenticado', async () => {
    const mockUsersService = {
      getProfile: vi.fn().mockResolvedValue({
        uid: 'user-1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        emailVerified: true,
        age18Confirmed: true,
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:00:00.000Z',
      }),
    } as unknown as UsersService;

    const controller = new UsersController(mockUsersService);
    const user: AuthenticatedUser = {
      uid: 'user-1',
      email: 'ana@example.com',
      emailVerified: true,
    };

    const response = await controller.getProfile(user);

    expect(mockUsersService.getProfile).toHaveBeenCalledWith(user);
    expect(response.emailVerified).toBe(true);
  });
});
