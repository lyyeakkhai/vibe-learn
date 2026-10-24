import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SyncUserDto } from './dto/sync-user.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncUser(@CurrentUser() user: User, @Body() syncUserDto: SyncUserDto) {
    return this.usersService.syncUser(user.id, syncUserDto);
  }
}
