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

  async findByIdWithProgress(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: { progress: true },
    });
  }

  async upsertUser(data: { id: string; email?: string | null; fullName?: string | null }): Promise<User> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({
        id: data.id,
        email: data.email ?? null,
        fullName: data.fullName ?? null,
      })
      .orUpdate(['email', 'full_name', 'updated_at'], ['id'])
      .execute();

    const user = await this.findById(data.id);
    return user!;
  }
}
