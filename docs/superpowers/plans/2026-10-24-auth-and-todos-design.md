# Authentication & Scoped Todos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement production-grade native authentication (`argon2` password hashing, short-lived JWT access tokens, HttpOnly refresh token rotation) and resource-level authorization scoping via a Todos module and global `JwtAuthGuard`, fully connected to the React frontend.

**Architecture:** NestJS global guard architecture (`JwtAuthGuard` registered as `APP_GUARD`) with `@Public()` decorator for public endpoints, `argon2` for password hashing and refresh token storage, cookie-based token rotation with logout, strict resource ownership scoping on `/api/todos` using `@CurrentUser()`, and role-based access control (`@Roles('admin')`) on administrative routes.

**Tech Stack:** NestJS 11, TypeScript 5.7+, TypeORM, PostgreSQL, `argon2`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `cookie-parser`, React 19, Vite, Tailwind CSS.

## Global Constraints
- Passwords must be hashed using `argon2`. Never store or return raw passwords or password hashes.
- Signup returns HTTP 201 `{ id, email }` without password hash; returns HTTP 409 Conflict if email is registered.
- Login returns HTTP 200 `{ accessToken, user }` and sets an HttpOnly cookie for `refreshToken`; returns HTTP 401 Unauthorized with uniform message "Invalid credentials" on bad email or password.
- Every route is protected by default by a global `JwtAuthGuard` unless explicitly marked `@Public()`.
- Every Todo query is scoped to `ownerId === user.id`; accessing another user's Todo returns HTTP 404 (or 403).
- Strict TypeScript compile and ESLint checks must pass across `frontend` and `backend`.

---

### Task 1: Database Entities & Migration for User and Todo

**Files:**
- Modify: `backend/src/modules/users/entities/user.entity.ts`
- Create: `backend/src/modules/todos/entities/todo.entity.ts`
- Create: `backend/src/database/migrations/1729785000000-AddAuthAndTodos.ts`

**Interfaces:**
- Produces: Updated `User` entity with `passwordHash`, `hashedRefreshToken`, `todos` relation; `Todo` entity with `id`, `title`, `isCompleted`, `ownerId`, `owner` relation.

- [ ] **Step 1: Update User entity with authentication fields**
  Add `passwordHash` (varchar, `{ select: false }`), `hashedRefreshToken` (varchar, nullable, `{ select: false }`), and `@OneToMany(() => Todo, (todo) => todo.owner)`.

- [ ] **Step 2: Create Todo entity**
  Define `Todo` in `backend/src/modules/todos/entities/todo.entity.ts` with `id: uuid`, `title: varchar`, `isCompleted: boolean`, `ownerId: varchar`, and `@ManyToOne(() => User)`.

- [ ] **Step 3: Create and run TypeORM migration**
  Write migration `backend/src/database/migrations/1729785000000-AddAuthAndTodos.ts` to add columns to `users` and create `todos` table with foreign key and index on `owner_id`. Execute migration.

- [ ] **Step 4: Verify entity schema in PostgreSQL**
  Verify tables `users` and `todos` exist with required columns using migration script or psql.

- [ ] **Step 5: Commit**
  `git commit -m "feat(database): update User entity and create Todo entity with migration"`

---

### Task 2: Environment Config & Cleanup of Temporary Scaffolding

**Files:**
- Modify: `backend/src/config/env.validation.ts`
- Modify: `backend/.env.example`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`
- Delete: `backend/src/auth-module/`

**Interfaces:**
- Produces: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` in config; `cookie-parser` active in Express.

- [ ] **Step 1: Remove temporary `backend/src/auth-module/`**
  Delete `backend/src/auth-module/` and remove `AuthModuleModule` import from `backend/src/app.module.ts`.

- [ ] **Step 2: Update environment variable validation with JWT secrets**
  Add `JWT_SECRET` (default: `'vibelearn_super_secret_jwt_access_key_2026'`), `JWT_REFRESH_SECRET` (default: `'vibelearn_super_secret_jwt_refresh_key_2026'`), `JWT_EXPIRES_IN` (default: `'15m'`), and `JWT_REFRESH_EXPIRES_IN` (default: `'7d'`) in `backend/src/config/env.validation.ts` and `backend/.env.example`.

- [ ] **Step 3: Register `cookie-parser` in `backend/src/main.ts`**
  Import `cookieParser` and register via `app.use(cookieParser())`.

- [ ] **Step 4: Verify backend compilation**
  Run `cd backend && npm run build`.

- [ ] **Step 5: Commit**
  `git commit -m "chore(config): configure jwt secrets and cookie-parser, remove scaffolded auth-module"`

---

### Task 3: Backend Authentication Module (`backend/src/modules/auth/`)

**Files:**
- Create: `backend/src/modules/auth/dto/signup.dto.ts`
- Create: `backend/src/modules/auth/dto/login.dto.ts`
- Create: `backend/src/modules/auth/decorators/public.decorator.ts`
- Create: `backend/src/modules/auth/decorators/current-user.decorator.ts`
- Create: `backend/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/modules/auth/guards/jwt-auth.guard.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/modules/courses/courses.controller.ts`
- Modify: `backend/src/modules/lessons/lessons.controller.ts`

**Interfaces:**
- Consumes: `User` entity, `UsersService`, `ConfigService`, `@nestjs/jwt`, `argon2`.
- Produces: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, global `JwtAuthGuard`, `@Public()`, `@CurrentUser()`.

- [ ] **Step 1: Create DTOs & Decorators**
  - `SignupDto`: `email` (IsEmail), `password` (IsString, MinLength 6), `fullName` (Optional).
  - `LoginDto`: `email` (IsEmail), `password` (IsString).
  - `@Public()`: sets metadata key `'isPublic'` to `true`.
  - `@CurrentUser()`: extracts `request.user`.

- [ ] **Step 2: Implement JwtStrategy & JwtAuthGuard**
  - `JwtStrategy`: extends `PassportStrategy(Strategy)`. Extracts Bearer token from header. Validates `{ sub, email, role }` and returns user object.
  - `JwtAuthGuard`: extends `AuthGuard('jwt')`. Checks `Reflector` for `@Public()`. If public, returns `true`; otherwise validates JWT.

- [ ] **Step 3: Implement AuthService with argon2 & token rotation**
  - `signup(dto)`: checks email existence -> throws 409 Conflict if found. Hashes password via `argon2.hash()`. Returns `{ id, email }`.
  - `login(dto, res)`: fetches user with `passwordHash`. Verifies with `argon2.verify()`. If invalid, throws 401 with "Invalid credentials". Signs `accessToken` (15m) and `refreshToken` (7d). Hashes `refreshToken` with `argon2.hash()` and stores in `user.hashedRefreshToken`. Sets HttpOnly cookie for `refreshToken`. Returns `{ accessToken, user }`.
  - `refresh(cookies, res)`: reads `refreshToken` cookie -> verifies JWT and `argon2.verify(user.hashedRefreshToken, token)`. Rotates access token and refresh token, updates database and cookie. Returns `{ accessToken }`.
  - `logout(userId, res)`: clears `user.hashedRefreshToken = null` in DB, clears cookie via `res.clearCookie('refreshToken')`. Returns `{ message: 'Logged out successfully' }`.

- [ ] **Step 4: Implement AuthController**
  Expose endpoints:
  - `@Public() @Post('signup')` -> calls `authService.signup(dto)`.
  - `@Public() @Post('login')` -> calls `authService.login(dto, res)`.
  - `@Public() @Post('refresh')` -> calls `authService.refresh(req.cookies, res)`.
  - `@Post('logout')` -> calls `authService.logout(user.id, res)`.

- [ ] **Step 5: Register global guard & decorate public routes**
  - Register `JwtAuthGuard` as `APP_GUARD` in `AppModule`.
  - Add `@Public()` to public endpoints in `CoursesController` (`findAll`, `findOne`) and `LessonsController` (`findBySlug`).

- [ ] **Step 6: Verify backend build & lint**
  Run `cd backend && npm run lint && npm run build`.

- [ ] **Step 7: Commit**
  `git commit -m "feat(auth): implement argon2 signup, login, refresh rotation, and global JwtAuthGuard"`

---

### Task 4: Scoped Todos Module (`backend/src/modules/todos/`)

**Files:**
- Create: `backend/src/modules/todos/dto/create-todo.dto.ts`
- Create: `backend/src/modules/todos/dto/update-todo.dto.ts`
- Create: `backend/src/modules/todos/todos.service.ts`
- Create: `backend/src/modules/todos/todos.controller.ts`
- Create: `backend/src/modules/todos/todos.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `Todo` entity, `@CurrentUser()`.
- Produces: `POST /api/todos`, `GET /api/todos`, `GET /api/todos/:id`, `PATCH /api/todos/:id`, `DELETE /api/todos/:id`.

- [ ] **Step 1: Create DTOs**
  - `CreateTodoDto`: `title` (IsString, IsNotEmpty).
  - `UpdateTodoDto`: `title` (Optional, IsString), `isCompleted` (Optional, IsBoolean).

- [ ] **Step 2: Implement TodosService with ownership scoping**
  - `createFor(dto, user)`: creates todo setting `ownerId = user.id`.
  - `findAllFor(user)`: `find({ where: { ownerId: user.id } })`.
  - `findOneFor(id, user)`: `findOne({ where: { id } })`. If `!todo || (todo.ownerId !== user.id && user.role !== 'admin')`, throws `NotFoundException('Todo not found')` (HTTP 404).
  - `updateFor(id, dto, user)`: calls `findOneFor(id, user)`, applies updates, saves.
  - `removeFor(id, user)`: calls `findOneFor(id, user)`, removes todo.

- [ ] **Step 3: Implement TodosController & register in AppModule**
  - Standard CRUD controller at `/api/todos` using `@CurrentUser() user`.
  - Register `TodosModule` in `AppModule`.

- [ ] **Step 4: Verify backend build & lint**
  Run `cd backend && npm run lint && npm run build`.

- [ ] **Step 5: Commit**
  `git commit -m "feat(todos): implement ownership-scoped Todos module with findOneFor check"`

---

### Task 5: Admin Module & RBAC Protection (`backend/src/modules/admin/`)

**Files:**
- Create: `backend/src/modules/admin/admin.controller.ts`
- Create: `backend/src/modules/admin/admin.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `@Roles('admin')`, `RolesGuard`.
- Produces: `GET /api/admin/overview`.

- [ ] **Step 1: Implement AdminController**
  Create `GET /api/admin/overview` with `@UseGuards(RolesGuard)` and `@Roles('admin')`. Returns administrative metrics.

- [ ] **Step 2: Register AdminModule in AppModule**
  Import `AdminModule` in `AppModule`.

- [ ] **Step 3: Verify RBAC compile & build**
  Run `cd backend && npm run build`.

- [ ] **Step 4: Commit**
  `git commit -m "feat(admin): create admin overview endpoint protected by RolesGuard"`

---

### Task 6: Frontend React Auth & API Integration

**Files:**
- Modify: `frontend/src/contexts/auth-context.tsx`
- Modify: `frontend/src/lib/api-client.ts`
- Modify: `frontend/src/pages/sign-in-page.tsx`
- Modify: `frontend/src/pages/sign-up-page.tsx`

**Interfaces:**
- Consumes: Backend `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/refresh`.
- Produces: Real client-side session management with automatic Bearer token injection and error alerts.

- [ ] **Step 1: Wire AuthContext to real backend auth endpoints**
  Update `login(email, password)` and `signup(data)` to call `ApiClient.post('/auth/login')` and `ApiClient.post('/auth/signup')`. Set access token in `ApiClient.setAuthToken()`.

- [ ] **Step 2: Add 401 automatic token refresh in ApiClient**
  Update `ApiClient.request`: on 401 response, if not already refreshing and credentials allow, call `POST /auth/refresh` with cookies; on success update token and retry original request.

- [ ] **Step 3: Update SignInPage & SignUpPage with real error states**
  Show inline error alerts on 401 ("Invalid credentials") and 409 ("Email is already registered"). Retain quick demo helper buttons for convenience.

- [ ] **Step 4: Verify frontend build & lint**
  Run `cd frontend && npm run lint && npm run build`.

- [ ] **Step 5: Commit**
  `git commit -m "feat(frontend): connect AuthContext and sign-in/up forms to live backend auth endpoints"`

---

### Task 7: End-to-End Verification (Alice vs Bob Test Suite) & Roadmap Update

**Files:**
- Modify: `docs/roadmap.md`

**Interfaces:**
- Executes full curl protocol against live server and marks task complete in roadmap.

- [ ] **Step 1: Run comprehensive verification script**
  Test all 14 points:
  1. Signup Alice -> 201 `{ id, email }` without password hash.
  2. Duplicate signup Alice -> 409 Conflict.
  3. Signup Bob -> 201 `{ id, email }`.
  4. Login bad password -> 401 "Invalid credentials".
  5. GET `/api/todos` without token -> 401 Unauthorized.
  6. Login Alice -> 200 `{ accessToken }` + Set-Cookie `refreshToken`.
  7. Alice creates todo -> 201 Created (`aliceTodoId`).
  8. Login Bob -> 200 `{ accessToken }`.
  9. Bob creates todo -> 201 Created (`bobTodoId`).
  10. Alice lists todos -> 200 OK (contains ONLY Alice's todo).
  11. Alice accesses `GET /api/todos/:bobTodoId` -> 404 Not Found.
  12. Refresh token rotation -> 200 OK with new access token and rotated cookie.
  13. Alice requests `GET /api/admin/overview` -> 403 Forbidden.
  14. Logout Alice -> 200 OK, cookie cleared, refresh token revoked.

- [ ] **Step 2: Update roadmap**
  Record and mark task 4.14 in `docs/roadmap.md`.

- [ ] **Step 3: Final full project check & commit**
  Run `pnpm run build` from root. Commit and report results.
