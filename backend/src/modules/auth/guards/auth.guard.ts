import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      let userId: string;
      let email: string | null = null;
      let fullName: string | null = null;
      let resolvedRole: UserRole = 'user';

      // 1. Support developer/demo tokens or standard token identifiers
      if (token.startsWith('mock_user_') || token.startsWith('user_')) {
        userId = token;
        email = `${token}@example.com`;
        fullName = token.includes('admin') ? 'Admin User' : 'Learner User';
        if (token.includes('admin')) {
          resolvedRole = 'admin';
        }
      } else {
        // Fallback or generic token parsing until course auth is hooked up
        userId = token;
        email = `${token}@example.com`;
        fullName = 'User';
      }

      // Check ADMIN_EMAILS environment fallback
      if (resolvedRole !== 'admin' && email) {
        const adminEmails =
          this.configService.get<string>('ADMIN_EMAILS') || '';
        const adminList = adminEmails
          .split(',')
          .map((e) => e.trim().toLowerCase());
        if (adminList.includes(email.toLowerCase())) {
          resolvedRole = 'admin';
        }
      }

      // 2. Just-in-Time user resolution / persistence in PostgreSQL
      const user = await this.usersService.findOrCreate({
        id: userId,
        email,
        fullName,
        role: resolvedRole,
      });

      // 3. Attach user to request
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Authentication failure: ${error?.message || error}`);
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }
}
