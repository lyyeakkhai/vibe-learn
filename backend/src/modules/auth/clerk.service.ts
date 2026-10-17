import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, ClerkClient, verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly clerk: ClerkClient;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY') || 'sk_test_placeholder';
    const publishableKey = this.config.get<string>('CLERK_PUBLISHABLE_KEY') || 'pk_test_placeholder';
    this.clerk = createClerkClient({ secretKey, publishableKey });
  }

  async verifyToken(token: string): Promise<any> {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    return verifyToken(token, { secretKey });
  }

  async getUser(userId: string): Promise<any> {
    return this.clerk.users.getUser(userId);
  }
}
