import { Module, Global } from '@nestjs/common';
import { ClerkService } from './clerk.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [ClerkService, ClerkAuthGuard, RolesGuard],
  exports: [ClerkService, ClerkAuthGuard, RolesGuard],
})
export class AuthModule {}
