import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  /** All users, sorted by name. */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Creates a user. */
  @Post()
  @ApiConflictResponse({ description: 'Email already in use.' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }
}
