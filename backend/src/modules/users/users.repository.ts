import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  async findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.hashedRefreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByIdWithProgress(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: { progress: true },
    });
  }

  async createAuthUser(data: {
    id: string;
    email: string;
    passwordHash: string;
    fullName?: string | null;
    role?: 'user' | 'admin';
  }): Promise<User> {
    const user = this.repo.create({
      id: data.id,
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName ?? null,
      role: data.role || 'user',
    });
    return this.repo.save(user);
  }

  async updateRefreshToken(
    id: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.repo.update(id, { hashedRefreshToken });
  }

  async upsertUser(data: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    role?: 'user' | 'admin';
  }): Promise<User> {
    const values: Record<string, any> = {
      id: data.id,
      email: data.email ?? null,
      fullName: data.fullName ?? null,
    };
    const updateColumns = ['email', 'full_name', 'updated_at'];

    if (data.role) {
      values.role = data.role;
      updateColumns.push('role');
    }

    await this.repo
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(values)
      .orUpdate(updateColumns, ['id'])
      .execute();

    const user = await this.findById(data.id);
    return user!;
  }
}
