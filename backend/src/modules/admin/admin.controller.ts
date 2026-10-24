import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminController {
  @Get('overview')
  @HttpCode(HttpStatus.OK)
  getOverview(@CurrentUser() user: any) {
    return {
      status: 'success',
      message: 'Admin access authorized',
      adminUser: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
