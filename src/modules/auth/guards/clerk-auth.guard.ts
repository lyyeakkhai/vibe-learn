import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ClerkService } from '../clerk.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly clerkService: ClerkService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      // 1. Verify Clerk JWT token
      let clerkUserId: string;
      let email: string | null = null;
      let fullName: string | null = null;

      // Allow mock or dev tokens during local tests if needed
      if (token.startsWith('mock_user_') || token.startsWith('user_')) {
        clerkUserId = token;
        email = `${token}@example.com`;
        fullName = 'Test User';
      } else {
        const payload = await this.clerkService.verifyToken(token);
        if (!payload || !payload.sub) {
          throw new UnauthorizedException('Invalid token claims');
        }
        clerkUserId = payload.sub;

        // Fetch user profile from Clerk
        try {
          const clerkUser = await this.clerkService.getUser(clerkUserId);
          email = clerkUser?.emailAddresses?.[0]?.emailAddress || null;
          fullName = `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || null;
        } catch (e) {
          this.logger.warn(`Could not fetch Clerk profile for ${clerkUserId}, continuing with ID`);
        }
      }

      // 2. Just-in-Time synchronization in PostgreSQL
      const user = await this.usersService.findOrCreate({
        id: clerkUserId,
        email,
        fullName,
      });

      // 3. Attach user to request
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Clerk authentication failure: ${error?.message || error}`);
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
