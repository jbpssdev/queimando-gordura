import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { VerifiedEmailGuard } from '../auth/verified-email.guard.js';
import { CreateCustomFoodDto } from './dto/create-custom-food.dto.js';
import { SearchFoodsDto } from './dto/search-foods.dto.js';
import { UpdateCustomFoodDto } from './dto/update-custom-food.dto.js';
import { FoodsService } from './foods.service.js';
import type { FoodItem, FoodSearchResponse } from './types/food.types.js';

@Controller('foods')
@UseGuards(FirebaseAuthGuard, VerifiedEmailGuard)
export class FoodsController {
  constructor(@Inject(FoodsService) private readonly foodsService: FoodsService) {}

  @Get()
  async searchFoods(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: SearchFoodsDto,
  ): Promise<FoodSearchResponse> {
    return this.foodsService.searchFoods(user, dto);
  }

  @Post('me')
  @HttpCode(HttpStatus.CREATED)
  async createCustomFood(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomFoodDto,
  ): Promise<FoodItem> {
    return this.foodsService.createCustomFood(user, dto);
  }

  @Patch('me/:id')
  async updateCustomFood(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFoodDto,
  ): Promise<FoodItem> {
    return this.foodsService.updateCustomFood(id, user, dto);
  }

  @Delete('me/:id')
  async deleteCustomFood(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean; deletedAt: string }> {
    return this.foodsService.deleteCustomFood(id, user);
  }

  @Get(':id')
  async getFoodById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<FoodItem> {
    return this.foodsService.getFoodById(id, user);
  }
}

// Suporte para runners com Vite/Vitest que não emitem metadados automaticamente
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, SearchFoodsDto],
  FoodsController.prototype,
  'searchFoods',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, CreateCustomFoodDto],
  FoodsController.prototype,
  'createCustomFood',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String, UpdateCustomFoodDto],
  FoodsController.prototype,
  'updateCustomFood',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String],
  FoodsController.prototype,
  'deleteCustomFood',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String],
  FoodsController.prototype,
  'getFoodById',
);
