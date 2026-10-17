# Supabase PostgreSQL Production Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Vibelearn Backend database from local Docker PostgreSQL to remote Supabase PostgreSQL (Session Pooler port 5432) with dual-mode connection support, automated SSL configuration, schema migrations, and idempotent data seeding.

**Architecture:** Update `data-source.ts` and `database.module.ts` to inspect `DATABASE_URL` (Supabase URI) first and apply TLS/SSL (`rejectUnauthorized: false`) when connecting to remote hosts, falling back to discrete `DB_*` variables for local development. Run TypeORM CLI migration to create tables in Supabase, then seed data idempotently.

**Tech Stack:** NestJS 11, TypeORM 0.3+, PostgreSQL (Supabase Session Pooler), `dotenv`, TypeScript 5.7+

## Global Constraints

- Never hardcode credentials in code files; read from `.env` via `process.env` or NestJS `ConfigService`.
- `.env` must remain in `.gitignore`.
- Support SSL with `rejectUnauthorized: false` for Supabase connections while allowing non-SSL local connections.
- Preserve referential integrity and existing entity cascade rules (`onDelete: 'CASCADE'`).
- Retain all existing unit and integration test behaviors.

---

### Task 1: Environment Variables Configuration

**Files:**
- Modify: `.env`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Supabase Session Pooler connection string (`postgresql://postgres.cjijaeecoasgfbufijqa:gybvob-2cykmE-razqar@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`)
- Produces: `DATABASE_URL` and `DB_SSL` environment variables accessible to NestJS and TypeORM CLI.

- [ ] **Step 1: Update `.env.example`**

Add `DATABASE_URL` and `DB_SSL` documentation to `.env.example`:
```env
PORT=3000
NODE_ENV=development

# Database Configuration (Supabase or Local Docker)
# If DATABASE_URL is set, it takes priority over DB_HOST / DB_PORT / etc.
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres
DB_SSL=true

# Fallback: Local PostgreSQL Database (Docker on OrbStack)
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=vibelearn
DB_PASSWORD=vibelearn_password
DB_NAME=vibelearn_db
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_mock_secret_key_vibelearn
CLERK_PUBLISHABLE_KEY=pk_test_mock_publishable_key_vibelearn

# Frontend CORS
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 2: Update `.env`**

Add `DATABASE_URL` and `DB_SSL` to `.env`:
```env
PORT=3000
NODE_ENV=development

# Supabase Production PostgreSQL (Session Pooler)
DATABASE_URL=postgresql://postgres.cjijaeecoasgfbufijqa:gybvob-2cykmE-razqar@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
DB_SSL=true

# PostgreSQL Database (Docker on OrbStack fallback)
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=vibelearn
DB_PASSWORD=vibelearn_password
DB_NAME=vibelearn_db
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_dWx0aW1hdGUtYnVycm8tMzQwMi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_Lqs625njn7mUqqfM4Xj1qdcntW1m7pICQO2jVeVwIT
# Frontend CORS
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 3: Verify `.env` is ignored by Git**

Run:
```bash
git status --ignored | grep .env
```
Expected output: `.env` is listed under ignored files.

- [ ] **Step 4: Commit `.env.example`**

```bash
git add .env.example
git commit -m "chore: add DATABASE_URL and DB_SSL configuration to .env.example"
```

---

### Task 2: TypeORM CLI DataSource Dual-Mode Connection

**Files:**
- Modify: `src/database/data-source.ts`

**Interfaces:**
- Consumes: `process.env.DATABASE_URL`, `process.env.DB_SSL`, or discrete `DB_*` variables.
- Produces: Exported `AppDataSource` instance for `migration:run`, `migration:revert`, and `db:seed`.

- [ ] **Step 1: Update `src/database/data-source.ts`**

Update `src/database/data-source.ts` with dual-mode resolution and SSL configuration:
```typescript
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { Course } from '../modules/courses/entities/course.entity';
import { CourseModule } from '../modules/course-modules/entities/course-module.entity';
import { Lesson } from '../modules/lessons/entities/lesson.entity';
import { Progress } from '../modules/progress/entities/progress.entity';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const isSslRequired =
  process.env.DB_SSL === 'true' ||
  (databaseUrl ? databaseUrl.includes('supabase.com') : false);

const baseOptions = {
  entities: [User, Course, CourseModule, Lesson, Progress],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  ssl: isSslRequired ? { rejectUnauthorized: false } : false,
};

const options: DataSourceOptions = databaseUrl
  ? {
      type: 'postgres',
      url: databaseUrl,
      ...baseOptions,
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      username: process.env.DB_USERNAME || 'vibelearn',
      password: process.env.DB_PASSWORD || 'vibelearn_password',
      database: process.env.DB_NAME || 'vibelearn_db',
      ...baseOptions,
    };

const AppDataSource = new DataSource(options);

export default AppDataSource;
```

- [ ] **Step 2: Test DataSource connection to Supabase via TypeORM CLI**

Run:
```bash
pnpm run migration:run -- -h
```
Expected: Help or DataSource loads successfully without syntax errors.

- [ ] **Step 3: Commit `src/database/data-source.ts`**

```bash
git add src/database/data-source.ts
git commit -m "feat(database): support DATABASE_URL and SSL in TypeORM DataSource"
```

---

### Task 3: NestJS TypeOrmModule Dual-Mode Connection

**Files:**
- Modify: `src/database/database.module.ts`

**Interfaces:**
- Consumes: NestJS `ConfigService` reading `DATABASE_URL`, `DB_SSL`, `NODE_ENV`.
- Produces: Configured `TypeOrmModule` for the NestJS dependency injection container.

- [ ] **Step 1: Update `src/database/database.module.ts`**

Update `src/database/database.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isSsl =
          config.get<string>('DB_SSL') === 'true' ||
          (databaseUrl ? databaseUrl.includes('supabase.com') : false);

        const baseOptions = {
          autoLoadEntities: true,
          synchronize:
            config.get<string>('NODE_ENV') !== 'production' && !databaseUrl,
          logging: config.get<boolean>('DB_LOGGING', false),
          ssl: isSsl ? { rejectUnauthorized: false } : false,
        };

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ...baseOptions,
          };
        }

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5433),
          username: config.get<string>('DB_USERNAME', 'vibelearn'),
          password: config.get<string>('DB_PASSWORD', 'vibelearn_password'),
          database: config.get<string>('DB_NAME', 'vibelearn_db'),
          ...baseOptions,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

- [ ] **Step 2: Run unit tests to verify DatabaseModule & Services**

Run:
```bash
pnpm test
```
Expected: All existing unit tests pass.

- [ ] **Step 3: Commit `src/database/database.module.ts`**

```bash
git add src/database/database.module.ts
git commit -m "feat(database): add dual-mode DATABASE_URL and SSL support to DatabaseModule"
```

---

### Task 4: Run TypeORM Schema Migration Against Supabase

**Files:**
- Reads: `src/database/migrations/1792211078258-InitialSchema.ts`
- Modifies: Supabase PostgreSQL database schema

**Interfaces:**
- Consumes: `AppDataSource` from `src/database/data-source.ts`.
- Produces: Tables `users`, `courses`, `course_modules`, `lessons`, `progress` in Supabase.

- [ ] **Step 1: Execute TypeORM Migration**

Run:
```bash
pnpm run migration:run
```
Expected output:
```text
Migration InitialSchema1792211078258 has been executed successfully.
```

- [ ] **Step 2: Verify migration execution status**

Run:
```bash
pnpm exec typeorm-ts-node-commonjs migration:show -d src/database/data-source.ts
```
Expected: `[X] InitialSchema1792211078258` showing applied status.

---

### Task 5: Seed Courses, Modules, and Lessons into Supabase

**Files:**
- Reads: `docs/seed.ndjson`, `docs/videos.json`
- Executes: `src/database/seeds/seed.ts`
- Modifies: Supabase PostgreSQL database tables (`courses`, `course_modules`, `lessons`)

**Interfaces:**
- Consumes: Seed files and `AppDataSource`.
- Produces: 38 courses, structured modules, and lessons seeded into Supabase.

- [ ] **Step 1: Run the Database Seed Script**

Run:
```bash
pnpm run db:seed
```
Expected:
```text
--- Starting Vibelearn Database Seeding ---
Loaded ... videos metadata
Found 38 raw courses in seed.ndjson
Created course: ...
--- Seeding Completed Successfully ---
```

- [ ] **Step 2: Verify idempotency of the seed script**

Run:
```bash
pnpm run db:seed
```
Expected: Script completes without duplicating courses or failing unique constraint errors.

---

### Task 6: End-to-End Verification of Backend with Supabase

**Files:**
- Tests: `src/app.controller.spec.ts` and all service specs
- Verifies: Backend HTTP endpoints querying Supabase database

- [ ] **Step 1: Run complete test suite**

Run:
```bash
pnpm test
```
Expected: All tests pass.

- [ ] **Step 2: Build project**

Run:
```bash
pnpm run build
```
Expected: Build succeeds with zero TypeScript errors.

- [ ] **Step 3: Run quick live API verification**

Start backend in background or test script to query `/api/courses`:
```bash
curl -s http://localhost:3000/api/courses | grep "slug"
```
Expected: JSON response returning courses loaded directly from Supabase.
