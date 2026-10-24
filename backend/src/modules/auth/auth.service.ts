import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get accessSecret(): string {
    return (
      this.configService.get<string>('JWT_SECRET') ||
      'vibelearn_super_secret_jwt_access_key_2026'
    );
  }

  private get refreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'vibelearn_super_secret_jwt_refresh_key_2026'
    );
  }

  private get accessExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
  }

  private get refreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  async signup(dto: SignupDto): Promise<{ id: string; email: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const id = randomUUID();

    let role: UserRole = 'user';
    const adminEmails = this.configService.get<string>('ADMIN_EMAILS') || '';
    const adminList = adminEmails.split(',').map((e) => e.trim().toLowerCase());
    if (adminList.includes(dto.email.toLowerCase())) {
      role = 'admin';
    }

    const user = await this.usersService.createAuthUser({
      id,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName ?? null,
      role,
    });

    return {
      id: user.id,
      email: user.email,
    };
  }

  async login(
    dto: LoginDto,
    res: Response,
  ): Promise<{
    accessToken: string;
    user: {
      id: string;
      email: string;
      fullName: string | null;
      role: 'user' | 'admin';
    };
  }> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as any,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as any,
      },
    );

    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async refresh(
    cookies: Record<string, string>,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const rawRefreshToken = cookies?.['refreshToken'];
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload || !payload.sub) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findByIdWithRefreshToken(payload.sub);
    if (!user || !user.hashedRefreshToken) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    const isMatch = await argon2.verify(
      user.hashedRefreshToken,
      rawRefreshToken,
    );
    if (!isMatch) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token Rotation
    const newAccessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as any,
      },
    );

    const newRefreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as any,
      },
    );

    const newHashedRefreshToken = await argon2.hash(newRefreshToken);
    await this.usersService.updateRefreshToken(user.id, newHashedRefreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: newAccessToken };
  }

  async logout(userId: string, res: Response): Promise<{ message: string }> {
    if (userId) {
      await this.usersService.updateRefreshToken(userId, null);
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return { message: 'Logged out successfully' };
  }
}
