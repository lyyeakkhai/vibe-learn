import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './entities/todo.entity';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

export interface AuthUserContext {
  id: string;
  email?: string;
  role?: string;
}

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todosRepo: Repository<Todo>,
  ) {}

  async createFor(dto: CreateTodoDto, user: AuthUserContext): Promise<Todo> {
    const todo = this.todosRepo.create({
      title: dto.title,
      ownerId: user.id,
    });
    return this.todosRepo.save(todo);
  }

  async findAllFor(user: AuthUserContext): Promise<Todo[]> {
    return this.todosRepo.find({
      where: { ownerId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneFor(id: string, user: AuthUserContext): Promise<Todo> {
    const todo = await this.todosRepo.findOne({ where: { id } });
    const allowed = todo && (todo.ownerId === user.id || user.role === 'admin');
    if (!allowed) {
      throw new NotFoundException('Todo not found');
    }
    return todo;
  }

  async updateFor(
    id: string,
    dto: UpdateTodoDto,
    user: AuthUserContext,
  ): Promise<Todo> {
    const todo = await this.findOneFor(id, user);
    if (dto.title !== undefined) {
      todo.title = dto.title;
    }
    if (dto.isCompleted !== undefined) {
      todo.isCompleted = dto.isCompleted;
    }
    return this.todosRepo.save(todo);
  }

  async removeFor(id: string, user: AuthUserContext): Promise<void> {
    const todo = await this.findOneFor(id, user);
    await this.todosRepo.remove(todo);
  }
}
