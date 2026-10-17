# Architecture & Design: Supabase PostgreSQL Production Migration

**Document Date:** 2026-10-17  
**Status:** Approved  
**Scope:** Database Infrastructure & Migration  

---

## 1. Overview & Objectives

Vibelearn Backend is migrating from a local containerized PostgreSQL instance (Docker on OrbStack) to **Supabase PostgreSQL** in production. 

This design establishes:
1. **Flexible Dual-Mode Database Connection**: Seamlessly connects via `DATABASE_URL` (Supabase Connection URI) or falls back to discrete environment variables (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`).
2. **Robust SSL Support**: Automatic SSL configuration (`ssl: { rejectUnauthorized: false }`) required by Supabase while preserving non-SSL connections for local environments.
3. **Session Pooler Integration**: Uses Supabase Supavisor Session Pooler (port `5432`) to support TypeORM server-side prepared statements, connection pooling, and IPv4 compatibility.
4. **Automated Schema Migration & Data Seeding**: Applies TypeORM migrations to create all database tables and constraints in Supabase, followed by idempotent seeding of courses, modules, and lessons.

---

## 2. Supabase Connection Architecture

According to official Supabase guidelines, ORMs such as TypeORM require prepared statements, making the **Session Pooler (`port 5432`)** the recommended connection type for traditional server applications (unlike the Transaction Pooler `6543`, which rejects prepared statements).

```mermaid
flowchart TD
    subgraph Vibelearn Backend
        App[NestJS Application] --> DBModule[DatabaseModule]
        CLI[TypeORM CLI / Seeder] --> DataSource[data-source.ts]
    end

    subgraph Environment Config
        Env[.env / ConfigService]
        Env -->|DATABASE_URL & DB_SSL| DBModule
        Env -->|DATABASE_URL & DB_SSL| DataSource
    end

    subgraph Supabase Cloud
        Pooler[Supavisor Session Pooler :5432]
        DB[(PostgreSQL Database)]
        Pooler --> DB
    end

    DBModule -->|TLS / SSL| Pooler
    DataSource -->|TLS / SSL| Pooler
```

---

## 3. Configuration & Component Changes

### 3.1 Environment Configuration (`.env` and `.env.example`)
- **`DATABASE_URL`**:
  ```text
  postgresql://postgres.cjijaeecoasgfbufijqa:gybvob-2cykmE-razqar@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
  ```
- **`DB_SSL`**: `true` (enables TLS connection with `rejectUnauthorized: false`).
- **`.env.example`**: Updated with documentation for `DATABASE_URL` and `DB_SSL`.
- Note: `.env` is ignored in `.gitignore` to prevent credential exposure.

### 3.2 `src/database/database.module.ts`
Update `TypeOrmModule.forRootAsync` factory to dynamically inspect `DATABASE_URL`:
- If `DATABASE_URL` is set:
  - `url: config.get<string>('DATABASE_URL')`
  - `ssl: isSsl ? { rejectUnauthorized: false } : false`
- Otherwise fall back to:
  - `host`, `port`, `username`, `password`, `database`
- Retains `autoLoadEntities: true`, `synchronize: config.get('NODE_ENV') !== 'production' && !config.get('DATABASE_URL')` (disables auto-sync when connecting to remote/production database to prevent schema accidental corruption).

### 3.3 `src/database/data-source.ts`
Update the standalone TypeORM CLI `DataSource`:
- Read `process.env.DATABASE_URL` and `process.env.DB_SSL`.
- If `DATABASE_URL` is set, pass `url` and `ssl: { rejectUnauthorized: false }`.
- Otherwise fallback to discrete `process.env.DB_*` fields.
- Retains existing entity list (`User`, `Course`, `CourseModule`, `Lesson`, `Progress`) and migration paths.

---

## 4. Schema Migration & Data Seeding Execution

### 4.1 Schema Migration
Run TypeORM CLI migration:
```bash
pnpm run migration:run
```
This executes `src/database/migrations/1792211078258-InitialSchema.ts` against Supabase to create:
- `users`: Clerk ID primary key (`varchar`), email, name, image_url.
- `courses`: UUID primary key, title, slug (unique index), description, instructor, category, thumbnail_url, level, is_published.
- `course_modules`: UUID primary key, course_id (FK cascade), title, description, order_index.
- `lessons`: UUID primary key, module_id (FK cascade), title, description, video_url, youtube_video_id, duration_seconds, order_index.
- `progress`: UUID primary key, user_id (FK cascade), lesson_id (FK cascade), is_completed, last_position_seconds, completed_at, unique constraint `UNIQUE(user_id, lesson_id)`.

### 4.2 Idempotent Seeding
Run seed command:
```bash
pnpm run db:seed
```
- Reads `docs/seed.ndjson` and `docs/videos.json`.
- Safely populates the 38 courses, structured modules, and lessons.
- Skips already existing courses and lessons to prevent duplicates.

---

## 5. Verification & Testing Strategy

1. **Migration Verification**: Verify that tables exist in Supabase with correct indexes and constraints.
2. **Seed Verification**: Confirm course count equals 38 and lessons contain linked module and video metadata.
3. **Automated Unit & E2E Tests**: Run `pnpm test` to verify all services and controllers pass.
4. **Live Health Check & Query**: Run `pnpm run start:dev` and execute `curl http://localhost:3000/api/courses` to verify courses return properly from Supabase.
