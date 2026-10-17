# Vibelearn Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the complete production-grade Vibelearn backend with NestJS 11, TypeORM, PostgreSQL on Docker (OrbStack) port 5433, Clerk JWT authentication, public course/lesson APIs, user synchronization, progress tracking, and database seeding.

**Architecture:** Layered modular architecture (`Controller -> Service -> Repository -> TypeORM Entity`) with isolated feature modules (`auth`, `users`, `courses`, `course-modules`, `lessons`, `progress`, `database`, `common`). Every feature module is generated via `pnpm exec nest g resource modules/<name>` to guarantee consistent NestJS structure.

**Tech Stack:** NestJS 11, TypeScript 5.7+, TypeORM 0.3+, PostgreSQL 16, `@clerk/backend`, `class-validator`, `class-transformer`, `pnpm`.

---

## Global Constraints

- **NestJS CLI:** Every feature module MUST be scaffolded using `pnpm exec nest g resource modules/<name>`.
- **Docker Port:** PostgreSQL container port mapped to host `5433:5432` to avoid collisions on port `5432`.
- **Status Codes:** Strict HTTP status codes (`200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`).
- **Standard Envelope:** Error responses unified through `HttpExceptionFilter` with `{ statusCode, error, message, timestamp, path }`.
- **Data Integrity:** Cascading deletes on all child relationships (`onDelete: 'CASCADE'`) and composite unique index `UNIQUE(user_id, lesson_id)` on `progress`.
- **Reference Files:** Seed data located at `/Users/lyyeakkhai/workspace/vibe-learn/docs/seed.ndjson` and `/Users/lyyeakkhai/workspace/vibe-learn/docs/videos.json`.

---

### Task 1: Environment, Docker Compose & Dependency Installation

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.env`
- Modify: `package.json`

**Interfaces:**
- Consumes: Host Docker (OrbStack).
- Produces: PostgreSQL running on `localhost:5433` (`vibelearn` database) and required npm dependencies installed.

- [ ] **Step 1: Create `docker-compose.yml` for PostgreSQL 16**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: vibelearn-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: vibelearn
      POSTGRES_PASSWORD: vibelearn_password
      POSTGRES_DB: vibelearn_db
    ports:
      - "5433:5432"
    volumes:
      - vibelearn_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vibelearn -d vibelearn_db"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  vibelearn_pgdata:
```

- [ ] **Step 2: Create `.env.example` and local `.env`**
```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=vibelearn
DB_PASSWORD=vibelearn_password
DB_NAME=vibelearn_db
DB_SYNCHRONIZE=true
DB_LOGGING=false

# Clerk Auth
CLERK_SECRET_KEY=sk_test_placeholder
CLERK_PUBLISHABLE_KEY=pk_test_placeholder

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 3: Install TypeORM, PostgreSQL driver, Clerk, and Config packages**
Run:
```bash
pnpm add @nestjs/typeorm typeorm pg @nestjs/config @clerk/backend class-validator class-transformer
pnpm add -D @types/pg
```

- [ ] **Step 4: Verify Docker container starts and is healthy**
Run:
```bash
docker compose up -d
docker compose ps
```
Expected: `vibelearn-postgres` is `Up` and `healthy` on `0.0.0.0:5433->5432/tcp`.

- [ ] **Step 5: Commit changes**
```bash
git add docker-compose.yml .env.example package.json pnpm-lock.yaml
git commit -m "chore: setup docker postgres container, env template, and dependencies"
```

---

### Task 2: Database Module & TypeORM Configuration

**Files:**
- Create: `src/database/database.module.ts`
- Create: `src/database/data-source.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: Environment variables from `@nestjs/config`.
- Produces: TypeORM connection pool exported across the application.

- [ ] **Step 1: Write test for DatabaseModule configuration**
Create `src/database/database.module.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement `src/database/database.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5433),
        username: config.get<string>('DB_USERNAME', 'vibelearn'),
        password: config.get<string>('DB_PASSWORD', 'vibelearn_password'),
        database: config.get<string>('DB_NAME', 'vibelearn_db'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<boolean>('DB_LOGGING', false),
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

- [ ] **Step 3: Create `src/database/data-source.ts` for TypeORM CLI**
```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'vibelearn',
  password: process.env.DB_PASSWORD || 'vibelearn_password',
  database: process.env.DB_NAME || 'vibelearn_db',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
});
```

- [ ] **Step 4: Import ConfigModule and DatabaseModule in `src/app.module.ts`**
- [ ] **Step 5: Run tests and verify build**
Run: `pnpm run test src/database/database.module.spec.ts`
- [ ] **Step 6: Commit changes**
```bash
git add src/database/ src/app.module.ts
git commit -m "feat: configure database module with typeorm and environment variables"
```

---

### Task 3: Common Layer, Exception Filter & Validation Setup

**Files:**
- Create: `src/common/filters/http-exception.filter.ts`
- Create: `src/common/decorators/current-user.decorator.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: NestJS execution context.
- Produces: Standard JSON error envelope and typed `@CurrentUser()` parameter decorator.

- [ ] **Step 1: Write unit test for `HttpExceptionFilter`**
Create `src/common/filters/http-exception.filter.spec.ts`:
```typescript
import { HttpExceptionFilter } from './http-exception.filter';
import { NotFoundException } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should format HttpException into uniform envelope', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    const mockGetRequest = jest.fn().mockReturnValue({ url: '/api/courses/unknown' });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: mockGetResponse,
        getRequest: mockGetRequest,
      }),
    } as any;

    filter.catch(new NotFoundException('Course not found'), mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: 'Course not found',
        path: '/api/courses/unknown',
      }),
    );
  });
});
```

- [ ] **Step 2: Implement `src/common/filters/http-exception.filter.ts`**
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, any>;
      message = resp.message || message;
      error = resp.error || error;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`[${request.method}] ${request.url}`, exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

- [ ] **Step 3: Implement `src/common/decorators/current-user.decorator.ts`**
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
```

- [ ] **Step 4: Update `src/main.ts` with global prefix, validation pipe, and exception filter**
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
```

- [ ] **Step 5: Run tests and verify**
Run: `pnpm run test src/common/filters/http-exception.filter.spec.ts`
- [ ] **Step 6: Commit changes**
```bash
git add src/common/ src/main.ts
git commit -m "feat: setup global exception filter, validation pipe, and current user decorator"
```

---

### Task 4: Auth Module & Clerk JWT Authentication Guard

**Files:**
- Create: `src/modules/auth/auth.module.ts`
- Create: `src/modules/auth/clerk.service.ts`
- Create: `src/modules/auth/guards/clerk-auth.guard.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: Incoming HTTP request `Authorization: Bearer <token>`.
- Produces: Decoded Clerk JWT payload and verified `request.user`.

- [ ] **Step 1: Write unit test for `ClerkAuthGuard`**
Create `src/modules/auth/guards/clerk-auth.guard.spec.ts`:
- Test missing Authorization header returns `401 Unauthorized`.
- Test invalid Bearer token returns `401 Unauthorized`.
- Test valid token attaches user and returns `true`.

- [ ] **Step 2: Implement `src/modules/auth/clerk.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, ClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly clerk: ClerkClient;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    const publishableKey = this.config.get<string>('CLERK_PUBLISHABLE_KEY');
    this.clerk = createClerkClient({ secretKey, publishableKey });
  }

  async verifyToken(token: string) {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    return this.clerk.verifyToken(token, { secretKey });
  }

  async getUser(userId: string) {
    return this.clerk.users.getUser(userId);
  }
}
```

- [ ] **Step 3: Implement `src/modules/auth/guards/clerk-auth.guard.ts`**
- [ ] **Step 4: Implement `src/modules/auth/auth.module.ts`**
- [ ] **Step 5: Run tests and verify**
Run: `pnpm run test src/modules/auth/guards/clerk-auth.guard.spec.ts`
- [ ] **Step 6: Commit changes**
```bash
git add src/modules/auth/
git commit -m "feat: implement auth module with clerk token verification and guard"
```

---

### Task 5: Users Module (Entity, Repository, Controller & Just-in-Time Sync)

**Files:**
- Generate: `pnpm exec nest g resource modules/users --no-spec`
- Create: `src/modules/users/entities/user.entity.ts`
- Create: `src/modules/users/types/user.types.ts`
- Create: `src/modules/users/dto/sync-user.dto.ts`
- Create: `src/modules/users/users.repository.ts`
- Modify: `src/modules/users/users.service.ts`
- Modify: `src/modules/users/users.controller.ts`
- Modify: `src/modules/users/users.module.ts`
- Test: `src/modules/users/users.service.spec.ts`

**Interfaces:**
- Consumes: Clerk User ID and profile data.
- Produces: `User` entity records and endpoints `GET /api/users/me` and `POST /api/users/sync`.

- [ ] **Step 1: Scaffold Users module using Nest CLI**
Run: `pnpm exec nest g resource modules/users --no-spec`
(Select REST API, generate CRUD entrypoints: yes).

- [ ] **Step 2: Implement `src/modules/users/entities/user.entity.ts`**
```typescript
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Progress } from '../../progress/entities/progress.entity';

@Entity('users')
export class User {
  @PrimaryColumn('varchar', { length: 255 })
  id: string; // Clerk User ID

  @Column('varchar', { length: 255, nullable: true })
  email: string | null;

  @Column('varchar', { length: 255, nullable: true })
  fullName: string | null;

  @OneToMany(() => Progress, (progress) => progress.user)
  progress: Progress[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 3: Implement `UsersRepository` and `UsersService`**
Methods:
- `findById(id: string): Promise<User | null>`
- `findOrCreate(data: { id: string; email?: string; fullName?: string }): Promise<User>`
- `syncUser(id: string, data: SyncUserDto): Promise<User>`

- [ ] **Step 4: Update `UsersController` with explicit status codes**
- `GET /api/users/me` (Protected) -> `200 OK`
- `POST /api/users/sync` (Protected) -> `200 OK`

- [ ] **Step 5: Run tests and verify**
- [ ] **Step 6: Commit changes**
```bash
git add src/modules/users/
git commit -m "feat: implement users module with typeorm entity, repository, and sync endpoints"
```

---

### Task 6: Courses & Course-Modules Modules

**Files:**
- Generate: `pnpm exec nest g resource modules/courses --no-spec`
- Generate: `pnpm exec nest g resource modules/course-modules --no-spec`
- Create: `src/modules/courses/entities/course.entity.ts`
- Create: `src/modules/course-modules/entities/course-module.entity.ts`
- Create: `src/modules/courses/types/course.types.ts`
- Create: `src/modules/course-modules/types/course-module.types.ts`
- Create: `src/modules/courses/courses.repository.ts`
- Create: `src/modules/course-modules/course-modules.repository.ts`
- Create: `src/modules/courses/dto/create-course.dto.ts`
- Create: `src/modules/courses/dto/update-course.dto.ts`
- Create: `src/modules/courses/dto/query-courses.dto.ts`
- Create: `src/modules/course-modules/dto/create-course-module.dto.ts`
- Create: `src/modules/course-modules/dto/update-course-module.dto.ts`
- Modify: `src/modules/courses/courses.service.ts`
- Modify: `src/modules/courses/courses.controller.ts`

**Interfaces:**
- Consumes: Course query parameters and DTOs.
- Produces: `GET /api/courses` (`200 OK`), `GET /api/courses/:slug` (`200 OK` / `404 Not Found`), `POST /api/courses` (`201 Created`), `PUT /api/courses/:id` (`200 OK`), `DELETE /api/courses/:id` (`204 No Content`).

- [ ] **Step 1: Scaffold Courses and Course-Modules using Nest CLI**
Run:
```bash
pnpm exec nest g resource modules/courses --no-spec
pnpm exec nest g resource modules/course-modules --no-spec
```

- [ ] **Step 2: Implement `Course` entity and `CourseModule` entity**
Include all fields from design specification: `slug`, `title`, `summary`, `coverImageUrl`, `category`, `instructorName`, `level`, `price`, `popular`, `studentCount`, `learningOutcomes` (jsonb), and relations.

- [ ] **Step 3: Implement `CoursesRepository`**
Methods:
- `findAll(query: QueryCoursesDto): Promise<Course[]>`
- `findBySlug(slug: string): Promise<Course | null>` (with joined modules and lessons ordered by `position`)
- `createCourse(data: CreateCourseDto): Promise<Course>`
- `updateCourse(id: string, data: UpdateCourseDto): Promise<Course>`
- `deleteCourse(id: string): Promise<boolean>`

- [ ] **Step 4: Implement `CoursesController` with explicit HTTP decorators (`@HttpCode(HttpStatus.NO_CONTENT)`, etc.)**
- [ ] **Step 5: Write unit tests for `CoursesService`**
Create `src/modules/courses/courses.service.spec.ts`.
- [ ] **Step 6: Run tests and verify**
Run: `pnpm run test src/modules/courses/courses.service.spec.ts`
- [ ] **Step 7: Commit changes**
```bash
git add src/modules/courses/ src/modules/course-modules/
git commit -m "feat: implement courses and course-modules with relations, repository, and CRUD endpoints"
```

---

### Task 7: Lessons Module

**Files:**
- Generate: `pnpm exec nest g resource modules/lessons --no-spec`
- Create: `src/modules/lessons/entities/lesson.entity.ts`
- Create: `src/modules/lessons/types/lesson.types.ts`
- Create: `src/modules/lessons/dto/create-lesson.dto.ts`
- Create: `src/modules/lessons/dto/update-lesson.dto.ts`
- Create: `src/modules/lessons/lessons.repository.ts`
- Modify: `src/modules/lessons/lessons.service.ts`
- Modify: `src/modules/lessons/lessons.controller.ts`

**Interfaces:**
- Consumes: Lesson slug or ID.
- Produces: `GET /api/courses/:courseSlug/lessons/:lessonSlug` (`200 OK` / `404 Not Found`) and `GET /api/lessons/:id` (`200 OK` / `404 Not Found`).

- [ ] **Step 1: Scaffold Lessons module using Nest CLI**
Run: `pnpm exec nest g resource modules/lessons --no-spec`

- [ ] **Step 2: Implement `Lesson` entity**
Fields: `id`, `moduleId`, `courseId`, `title`, `slug`, `youtubeVideoId`, `videoUrl`, `duration`, `freePreview`, `notes` (jsonb), `notesPlain`, `keyPoints` (jsonb), `proTip`, `resources` (jsonb), `position`, `createdAt`.
Foreign keys: `onDelete: 'CASCADE'`.

- [ ] **Step 3: Implement `LessonsRepository` and `LessonsService`**
Methods:
- `findByCourseAndLessonSlug(courseSlug: string, lessonSlug: string): Promise<LessonDetailResponse>` (includes previous/next lesson navigation links).
- `findById(id: string): Promise<Lesson | null>`

- [ ] **Step 4: Implement `LessonsController` with status code handling**
- [ ] **Step 5: Write unit tests for `LessonsService`**
- [ ] **Step 6: Run tests and verify**
Run: `pnpm run test src/modules/lessons/lessons.service.spec.ts`
- [ ] **Step 7: Commit changes**
```bash
git add src/modules/lessons/
git commit -m "feat: implement lessons module with detailed content and curriculum navigation"
```

---

### Task 8: Progress Module (Tracking & Resumption)

**Files:**
- Generate: `pnpm exec nest g resource modules/progress --no-spec`
- Create: `src/modules/progress/entities/progress.entity.ts`
- Create: `src/modules/progress/types/progress.types.ts`
- Create: `src/modules/progress/progress.repository.ts`
- Create: `src/modules/progress/dto/upsert-progress.dto.ts`
- Modify: `src/modules/progress/progress.service.ts`
- Modify: `src/modules/progress/progress.controller.ts`

**Interfaces:**
- Consumes: Authenticated user and progress updates.
- Produces: `GET /api/progress` (`200 OK`), `POST /api/progress` (`200 OK`), `PATCH /api/progress/complete` (`200 OK`).

- [ ] **Step 1: Scaffold Progress module using Nest CLI**
Run: `pnpm exec nest g resource modules/progress --no-spec`

- [ ] **Step 2: Implement `Progress` entity with composite unique index**
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('progress')
@Unique(['userId', 'lessonId'])
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255, name: 'user_id' })
  userId: string;

  @Column('uuid', { name: 'course_id' })
  courseId: string;

  @Column('uuid', { name: 'lesson_id' })
  lessonId: string;

  @Column('boolean', { default: false, name: 'is_completed' })
  isCompleted: boolean;

  @Column('integer', { default: 0, name: 'resume_timestamp' })
  resumeTimestamp: number;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;
}
```

- [ ] **Step 3: Implement `ProgressRepository` with atomic native upsert**
Uses query builder:
```typescript
await this.repository
  .createQueryBuilder()
  .insert()
  .into(Progress)
  .values(dto)
  .orUpdate(['is_completed', 'resume_timestamp', 'updated_at'], ['user_id', 'lesson_id'])
  .returning('*')
  .execute();
```

- [ ] **Step 4: Implement `ProgressService` and `ProgressController` with `@UseGuards(ClerkAuthGuard)`**
- [ ] **Step 5: Write unit tests for `ProgressService`**
- [ ] **Step 6: Run tests and verify**
Run: `pnpm run test src/modules/progress/progress.service.spec.ts`
- [ ] **Step 7: Commit changes**
```bash
git add src/modules/progress/
git commit -m "feat: implement progress module with atomic upsert and video resume tracking"
```

---

### Task 9: Database Seeding Pipeline (`pnpm run db:seed`)

**Files:**
- Create: `src/database/seeds/seed.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `/Users/lyyeakkhai/workspace/vibe-learn/docs/seed.ndjson` and `/Users/lyyeakkhai/workspace/vibe-learn/docs/videos.json`.
- Produces: Populated database records in `courses`, `modules`, and `lessons`.

- [ ] **Step 1: Write `src/database/seeds/seed.ts`**
Script logic:
1. Initialize TypeORM DataSource.
2. Read and parse NDJSON records and videos JSON.
3. Transform categories, instructors, courses, modules, and lessons.
4. Insert courses, modules, and lessons with collision handling (idempotent upsert).
5. Output summary metrics (number of courses, modules, and lessons seeded).
6. Cleanly destroy DataSource connection.

- [ ] **Step 2: Add seed script command to `package.json`**
```json
"scripts": {
  "db:seed": "ts-node -r tsconfig-paths/register src/database/seeds/seed.ts"
}
```

- [ ] **Step 3: Execute `pnpm run db:seed` against local PostgreSQL container**
Expected output:
```text
Seeding complete:
- 10 Courses seeded
- 40 Modules seeded
- 120 Lessons seeded
```

- [ ] **Step 4: Commit changes**
```bash
git add src/database/seeds/ package.json
git commit -m "feat: implement idempotent database seeding pipeline from docs ndjson and json"
```

---

### Task 10: End-to-End Testing & Verification

**Files:**
- Modify: `test/app.e2e-spec.ts`
- Create: `test/courses.e2e-spec.ts`

**Interfaces:**
- Consumes: Running NestJS app.
- Produces: Verified HTTP response codes (`200`, `201`, `401`, `404`).

- [ ] **Step 1: Implement `test/courses.e2e-spec.ts`**
- Test `GET /api/courses` returns `200 OK` and non-empty array.
- Test `GET /api/courses/:slug` with valid slug returns `200 OK` and nested modules/lessons.
- Test `GET /api/courses/non-existent-slug` returns `404 Not Found` with standard JSON envelope.
- Test `GET /api/progress` without token returns `401 Unauthorized`.

- [ ] **Step 2: Run all unit and e2e tests**
Run:
```bash
pnpm run test
pnpm run test:e2e
```
Expected: All test suites PASS.

- [ ] **Step 3: Run build and lint verification**
Run:
```bash
pnpm run build
pnpm run lint
```
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit final verification changes**
```bash
git add test/
git commit -m "test: add comprehensive e2e tests for courses, status codes, and auth protection"
```
