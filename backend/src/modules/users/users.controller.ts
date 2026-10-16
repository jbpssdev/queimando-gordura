import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { VerifiedEmailGuard } from '../auth/verified-email.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UpsertUserProfileDto } from './dto/upsert-user-profile.dto.js';
import { UsersService } from './users.service.js';
import type { UserProfileResponse } from './types/user-profile.type.js';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Put('me')
  @UseGuards(FirebaseAuthGuard)
  async upsertProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertUserProfileDto,
  ): Promise<UserProfileResponse> {
    return this.usersService.upsertProfile(user, dto);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard, VerifiedEmailGuard)
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileResponse> {
    return this.usersService.getProfile(user);
  }
}

// Suporte para runners com Vite/Vitest que não emitem metadados automaticamente
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, UpsertUserProfileDto],
  UsersController.prototype,
  'upsertProfile',
);
Reflect.defineMetadata('design:paramtypes', [Object], UsersController.prototype, 'getProfile');
