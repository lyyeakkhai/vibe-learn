# AGENTS.md - Antigravity & Agent Operating Rules

This document defines the strict operating rules, architectural guidelines, and conventions for AI agents (including Antigravity) working in the **`vibelearn-backend`** repository.

> **CRITICAL RULE:** All agents and subagents MUST read and follow this document before generating code, scaffolding modules, or modifying the backend. Every implementation must strictly align with the specifications here and in [`docs/superpowers/specs/2026-10-17-vibelearn-backend-design.md`](docs/superpowers/specs/2026-10-17-vibelearn-backend-design.md).

---

## 1. Technology Stack & Environment

- **Framework:** NestJS 11 with TypeScript 5.7+
- **ORM:** TypeORM 0.3+ with `@nestjs/typeorm`
- **Database:** PostgreSQL 16 running in Docker (OrbStack)
- **Port Mapping:** Host `5433:5432` (avoids conflicting with other local containers on 5432)
- **Authentication:** Custom Course Authentication with Bearer JWT verification & Just-in-Time user synchronization
- **Validation:** `class-validator` & `class-transformer`
- **Package Manager:** `pnpm`

---

## 2. Mandatory NestJS CLI Generation & Folder Structure Rule

> **MANDATORY:** For every feature module, agents MUST use the NestJS CLI resource command to scaffold the initial module structure to speed up delivery and guarantee consistent boilerplate:

```bash
pnpm exec nest g resource modules/<resource-name> --no-spec (or with spec)
```
Examples:
- `pnpm exec nest g resource modules/courses`
- `pnpm exec nest g resource modules/lessons`
- `pnpm exec nest g resource modules/progress`
- `pnpm exec nest g resource modules/course-modules`

After scaffolding via the CLI, immediately organize into the strict layered architecture:
`Controller -> Service -> Repository -> Entity`

### Mandatory Folder Layout for EVERY Module:
Every feature module MUST contain these exact elements:
```text
src/modules/<resource-name>/
├── <resource-name>.controller.ts      # HTTP routing, parameter extraction, and status codes
├── <resource-name>.service.ts         # Pure business logic and domain orchestration
├── <resource-name>.repository.ts      # All TypeORM database queries (isolated)
├── <resource-name>.module.ts          # Dependency injection container for the module
├── <resource-name>.service.spec.ts    # Unit tests
├── dto/                               # Request/response validation with class-validator
│   ├── create-<resource>.dto.ts
│   └── update-<resource>.dto.ts
├── entities/                          # TypeORM @Entity() database table mappings
│   └── <resource>.entity.ts
└── types/                             # TypeScript interfaces & domain types
    └── <resource>.types.ts
```

---

## 3. Architectural Rules & Separation of Concerns

1. **Layered Structure:**
   - **Controllers:** HTTP handling, routing, DTO extraction, calling services, returning explicit HTTP status codes. **NO business logic and NO direct database queries.**
   - **Services:** Pure business rules, domain orchestration, and calling repositories.
   - **Repositories:** Responsible for all TypeORM queries. **NO database queries outside of repositories.**
   - **DTOs (`dto/`):** Validating client requests via `class-validator` / `class-transformer`.
   - **Entities (`entities/`):** TypeORM `@Entity()` definitions representing relational PostgreSQL tables.
   - **Types (`types/`):** Domain interfaces, JSONB structures, and internal data shapes.

2. **Explicit HTTP Status Codes:**
   Every controller method must return clear, accurate status codes:
   - `200 OK`: Successful reads (`GET`), updates (`PUT`/`PATCH`), and progress upserts.
   - `201 Created`: Successful resource creation (`POST /api/courses`, `POST /api/users/sync`).
   - `204 No Content`: Successful deletion (`DELETE /api/courses/:id`).
   - `400 Bad Request`: Form or DTO validation failures.
   - `401 Unauthorized`: Missing, invalid, or expired Clerk JWT Bearer token.
   - `403 Forbidden`: Authenticated user lacks sufficient permissions.
   - `404 Not Found`: Resource (course, lesson, user) does not exist.
   - `409 Conflict`: Unique constraint conflicts (e.g. duplicate slug).
   - `500 Internal Server Error`: Unhandled server exceptions intercepted by the global filter.

3. **Global Exception Handling & Validation:**
   - Global prefix: `/api`
   - Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
   - Global `HttpExceptionFilter` formatting all errors into uniform JSON envelopes:
     ```json
     {
       "statusCode": 404,
       "error": "Not Found",
       "message": "Course with slug '...' was not found",
       "timestamp": "2026-10-17T03:55:00.000Z",
       "path": "/api/courses/..."
     }
     ```

---

## 4. Authentication & Security Flow

- Route protection is enforced via `AuthGuard`.
- Public routes (`GET /api/courses`, `GET /api/courses/:slug`, `GET /api/lessons/:id`) are open.
- Protected routes (`/api/progress/*`, `/api/users/me`, Admin endpoints) require `Authorization: Bearer <token>`.
- Just-in-Time (JIT) user synchronization ensures that when a valid token arrives, the user record is automatically created or verified in the local PostgreSQL `users` table.
- Use `@CurrentUser()` custom decorator to inject the authenticated user entity into route handlers.

---

## 5. Database Schema & Data Integrity

- Primary keys: UUIDs for `courses`, `modules`, `lessons`, `progress`. String (Clerk ID) for `users`.
- Referential Integrity: All parent-child relations use `onDelete: 'CASCADE'`.
- Progress Tracking: Enforce `UNIQUE(user_id, lesson_id)` for atomic upserting of completion states and video playback resumption timestamps.
- Idempotent Seeding: CLI script (`pnpm run db:seed`) reads from `docs/seed.ndjson` and `docs/videos.json` and populates PostgreSQL idempotently.

---

## 6. Documentation Maintenance

- Keep all architecture, schema, and API documentation up to date inside `docs/` and `docs/superpowers/specs/`.
- Document any schema changes or new endpoints in the project design docs.
