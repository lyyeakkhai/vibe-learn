# Authentication & Scoped Todos System Design

## 1. Overview & Objectives

This design specification outlines the native authentication, authorization, and resource-scoping architecture for VibeLearn, fulfilling both the course lab requirements and production-grade security standards.

The core objectives:
1. **Secure Native Authentication:** Replace external providers with self-hosted `argon2` password hashing, short-lived JWT access tokens, and HttpOnly refresh token rotation.
2. **Secure by Default:** Implement a global `JwtAuthGuard` where every endpoint requires valid authentication unless explicitly decorated with `@Public()`.
3. **Resource Ownership & Scoping:** Implement an ownership model using a `Todo` domain resource (`todos.ownerId = user.id`), scoping all database queries and verifying record ownership before any read or mutation.
4. **Role-Based Access Control (RBAC):** Restrict administrative endpoints (`/api/admin/*`) via `@Roles('admin')` and `RolesGuard`.
5. **Full Frontend Integration:** Integrate the React client (`ApiClient` and `AuthProvider`) with the new authentication endpoints, automated Bearer token injection, and error handling.

---

## 2. Dependencies & Environment

All required libraries are already installed in `backend/package.json`:
* Password Hashing: `argon2` (`^0.45.1`)
* JWT & Auth Strategy: `@nestjs/jwt` (`^12.0.3`), `@nestjs/passport` (`^12.0.0`), `passport-jwt` (`^4.0.1`)
* Cookie Parsing: `cookie-parser` (`^1.4.7`), `@types/cookie-parser` (`^1.4.10`)
* Validation: `class-validator` (`^0.15.1`), `class-transformer` (`^0.5.1`)
* Database & ORM: `pg` (`^8.23.1`), `typeorm` (`^1.1.2`), `@nestjs/typeorm` (`^12.0.2`)

### Environment Variables (`backend/src/config/env.validation.ts`)
* `JWT_SECRET`: Secret key for signing 15-minute access tokens.
* `JWT_REFRESH_SECRET`: Dedicated secret key for signing 7-day refresh tokens.
* `JWT_EXPIRES_IN`: Access token duration (default: `'15m'`).
* `JWT_REFRESH_EXPIRES_IN`: Refresh token duration (default: `'7d'`).

---

## 3. Database Schema & Entity Design

### 3.1 User Entity (`backend/src/modules/users/entities/user.entity.ts`)
Update the existing `User` entity:
* `id`: `varchar(255)` primary key (UUID).
* `email`: `varchar(255)`, `unique: true`, `nullable: false`.
* `passwordHash`: `varchar(255)`, `nullable: false`, `{ select: false }` — prevented from being loaded in standard queries.
* `hashedRefreshToken`: `varchar(255)`, `nullable: true`, `{ select: false }` — stores argon2 hash of current active refresh token.
* `role`: `'user' | 'admin'`, default `'user'`.
* `fullName`: `varchar(255)`, `nullable: true`.
* `todos`: `@OneToMany(() => Todo, (todo) => todo.owner)`.
* `createdAt` & `updatedAt`: `timestamptz`.

### 3.2 Todo Entity (`backend/src/modules/todos/entities/todo.entity.ts`)
Create a new `Todo` entity:
* `id`: `uuid` primary key (`@PrimaryGeneratedColumn('uuid')`).
* `title`: `varchar(255)`, `nullable: false`.
* `isCompleted`: `boolean`, default `false`.
* `ownerId`: `varchar(255)`, `nullable: false`.
* `owner`: `@ManyToOne(() => User, (user) => user.todos, { onDelete: 'CASCADE' })`, `@JoinColumn({ name: 'owner_id' })`.
* `createdAt` & `updatedAt`: `timestamptz`.

### 3.3 TypeORM Migration
Create a migration in `backend/src/database/migrations/`:
* Alters `users` table:
  * Adds `password_hash varchar(255)`.
  * Adds `hashed_refresh_token varchar(255)`.
  * Ensures `email` is unique and non-null.
* Creates `todos` table:
  * `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  * `title varchar(255) NOT NULL`
  * `is_completed boolean NOT NULL DEFAULT false`
  * `owner_id varchar(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE`
  * `created_at timestamptz DEFAULT now()`
  * `updated_at timestamptz DEFAULT now()`
* Creates index on `todos(owner_id)`.

---

## 4. Backend Authentication Architecture

### 4.1 Folder Structure
Clean up temporary `backend/src/auth-module/` and organize within `backend/src/modules/auth/`:
```
backend/src/modules/auth/
├── auth.controller.ts
├── auth.service.ts
├── auth.module.ts
├── dto/
│   ├── signup.dto.ts
│   └── login.dto.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
└── decorators/
    ├── public.decorator.ts
    ├── current-user.decorator.ts
    └── roles.decorator.ts
```

### 4.2 Auth Endpoints & Logic
1. **`POST /api/auth/signup` (`@Public()`):**
   * Input DTO: `email` (IsEmail), `password` (MinLength 6), `fullName` (Optional).
   * Checks for existing user by email. If found, throws `ConflictException('Email is already registered')` (HTTP 409).
   * Hashes password via `argon2.hash(password)`.
   * Inserts user and returns HTTP 201 `{ id: user.id, email: user.email }` — **no password hash**.
2. **`POST /api/auth/login` (`@Public()`):**
   * Input DTO: `email`, `password`.
   * Queries user with `addSelect('user.passwordHash')`.
   * If user not found OR `argon2.verify(user.passwordHash, password)` fails, throws `UnauthorizedException('Invalid credentials')` (HTTP 401).
   * Generates access token (15m) with payload `{ sub: user.id, email: user.email, role: user.role }`.
   * Generates refresh token (7d) with payload `{ sub: user.id }`.
   * Hashes refresh token with `argon2.hash()` and saves to `user.hashedRefreshToken`.
   * Sets HttpOnly cookie:
     ```typescript
     res.cookie('refreshToken', refreshToken, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       path: '/api/auth',
       maxAge: 7 * 24 * 60 * 60 * 1000,
     });
     ```
   * Returns HTTP 200 `{ accessToken, user: { id, email, fullName, role } }`.
3. **`POST /api/auth/refresh` (`@Public()`):**
   * Reads `req.cookies['refreshToken']`. If missing, throws `UnauthorizedException('Refresh token missing')`.
   * Verifies JWT signature and extracts user ID (`sub`).
   * Fetches user with `addSelect('user.hashedRefreshToken')`.
   * Verifies cookie token against `user.hashedRefreshToken` via `argon2.verify()`. If invalid, clears cookie and throws `UnauthorizedException('Invalid or expired refresh token')`.
   * **Token Rotation:** Generates new access token and new refresh token. Hashes and updates `hashedRefreshToken` in database. Overwrites `refreshToken` cookie.
   * Returns HTTP 200 `{ accessToken }`.
4. **`POST /api/auth/logout`:**
   * Clears `user.hashedRefreshToken` in database.
   * Clears cookie: `res.clearCookie('refreshToken', { path: '/api/auth' })`.
   * Returns HTTP 200 `{ message: 'Logged out successfully' }`.

### 4.3 Guards & Decorators
* **`@Public()`:** Sets `IS_PUBLIC_KEY = 'isPublic'` metadata.
* **`JwtAuthGuard`:** Registered globally via `APP_GUARD` in `AppModule`.
  * If route has `@Public()` metadata, allows execution.
  * Otherwise validates JWT via `passport-jwt` strategy. If invalid/missing, returns HTTP 401 Unauthorized.
* **`@CurrentUser()`:** Injects `request.user` into controller handler arguments.
* **`RolesGuard` & `@Roles('admin')`:** Verifies that `request.user.role === 'admin'`. Throws HTTP 403 Forbidden on mismatch.

---

## 5. Scoped Todos Resource Architecture

### 5.1 Folder Structure (`backend/src/modules/todos/`)
```
backend/src/modules/todos/
├── todos.controller.ts
├── todos.service.ts
├── todos.module.ts
├── entities/
│   └── todo.entity.ts
└── dto/
    ├── create-todo.dto.ts
    └── update-todo.dto.ts
```

### 5.2 Scoping & Ownership Verification
* **Create (`POST /api/todos`):**
  * Body: `{ title: string }`.
  * Service automatically sets `ownerId = user.id`.
* **List (`GET /api/todos`):**
  * Service executes `todosRepository.find({ where: { ownerId: user.id }, order: { createdAt: 'DESC' } })`.
  * Alice only receives Alice's todos; Bob only receives Bob's todos.
* **Read One (`GET /api/todos/:id`):**
  * Service verifies ownership:
    ```typescript
    const todo = await this.todosRepository.findOne({ where: { id } });
    if (!todo || (todo.ownerId !== user.id && user.role !== 'admin')) {
      throw new NotFoundException('Todo not found');
    }
    return todo;
    ```
  * Accessing another user's item returns HTTP 404 Not Found.
* **Update & Delete (`PATCH /api/todos/:id`, `DELETE /api/todos/:id`):**
  * Both invoke `findOneFor(id, user)` prior to performing operations, ensuring strict resource isolation.

---

## 6. Admin Module Architecture (`backend/src/modules/admin/`)

* Controller: `AdminController` with prefix `'admin'`.
* Endpoint: `GET /api/admin/overview`
  * Guard: `@UseGuards(RolesGuard)` + `@Roles('admin')`.
  * Returns administrative overview metrics.
  * Access by standard user returns HTTP 403 Forbidden.

---

## 7. Frontend Client Integration

### 7.1 Auth Context (`frontend/src/contexts/auth-context.tsx`)
* Updates `login(email, password)` to invoke `ApiClient.post('/auth/login', { email, password })`.
* Saves `accessToken` and user details in memory and `localStorage`.
* Updates `ApiClient.setAuthToken(token)`.
* Updates `logout()` to call `ApiClient.post('/auth/logout')` and purge local state.

### 7.2 ApiClient Interceptor & Token Refresh (`frontend/src/lib/api-client.ts`)
* If an API request returns HTTP 401:
  * Attempts a single call to `POST /auth/refresh` (with cookies enabled).
  * If refresh succeeds with a new `accessToken`, updates token and replays the original request.
  * If refresh fails, logs the user out and redirects to `/sign-in`.

### 7.3 Sign In & Sign Up Pages
* `frontend/src/pages/sign-in-page.tsx`: Connects form submission to real `login()`. Displays error alert on 401 ("Invalid credentials").
* `frontend/src/pages/sign-up-page.tsx`: Connects form submission to real `signup()`. Displays error alert on 409 ("Email is already registered").

---

## 8. Verification & Test Protocol (Alice vs. Bob)

The verification will be executed via automated curl tests against `http://localhost:3000/api`:

| Step | Action | Method & Endpoint | Payload / Header | Expected Status | Expected Output |
|---|---|---|---|---|---|
| 1 | Register Alice | `POST /api/auth/signup` | `{ email: "alice@test.dev", password: "secret123", fullName: "Alice" }` | 201 Created | `{ id: "...", email: "alice@test.dev" }` (no password hash) |
| 2 | Duplicate Signup | `POST /api/auth/signup` | `{ email: "alice@test.dev", password: "secret123" }` | 409 Conflict | `{ message: "Email is already registered" }` |
| 3 | Register Bob | `POST /api/auth/signup` | `{ email: "bob@test.dev", password: "secret456", fullName: "Bob" }` | 201 Created | `{ id: "...", email: "bob@test.dev" }` |
| 4 | Bad Password Login | `POST /api/auth/login` | `{ email: "alice@test.dev", password: "wrongpassword" }` | 401 Unauthorized | `{ message: "Invalid credentials" }` |
| 5 | Unauthorized Todos | `GET /api/todos` | No token | 401 Unauthorized | `{ message: "Unauthorized" }` |
| 6 | Login Alice | `POST /api/auth/login` | `{ email: "alice@test.dev", password: "secret123" }` | 200 OK | `{ accessToken: "..." }` + Set-Cookie `refreshToken` |
| 7 | Create Alice Todo | `POST /api/todos` | Bearer Alice Token, `{ title: "Alice First Task" }` | 201 Created | `{ id: "aliceTodoId", title: "Alice First Task", ownerId: "..." }` |
| 8 | Login Bob | `POST /api/auth/login` | `{ email: "bob@test.dev", password: "secret456" }` | 200 OK | `{ accessToken: "..." }` + Set-Cookie `refreshToken` |
| 9 | Create Bob Todo | `POST /api/todos` | Bearer Bob Token, `{ title: "Bob Private Task" }` | 201 Created | `{ id: "bobTodoId", title: "Bob Private Task", ownerId: "..." }` |
| 10 | List Alice Todos | `GET /api/todos` | Bearer Alice Token | 200 OK | Array containing only Alice's task |
| 11 | Alice Access Bob Todo | `GET /api/todos/:bobTodoId` | Bearer Alice Token | 404 Not Found | `{ message: "Todo not found" }` |
| 12 | Rotate Refresh Token | `POST /api/auth/refresh` | Cookie `refreshToken` | 200 OK | `{ accessToken: "new..." }` + new Set-Cookie |
| 13 | Admin Check as User | `GET /api/admin/overview` | Bearer Alice Token (`role: 'user'`) | 403 Forbidden | `{ message: "Forbidden resource" }` |
| 14 | Logout | `POST /api/auth/logout` | Bearer Alice Token | 200 OK | Cookie cleared & refresh token revoked |

---

## 9. Security & OWASP API Top 10 Considerations

* **API1: Broken Object Level Authorization (BOLA):** Prevented by enforcing ownership checks in both queries (`where: { ownerId: user.id }`) and service lookups (`findOneFor`).
* **API2: Broken Authentication:** Prevented by `argon2` slow hashing, uniform "Invalid credentials" error responses, short-lived 15m access tokens, and HttpOnly refresh token rotation.
* **API3: Broken Object Property Level Authorization:** DTOs strictly forbid clients from passing `ownerId`, `role`, or `passwordHash`.
* **API4: Unrestricted Resource Consumption:** Refresh cookies and access tokens are strictly validated and scoped; rate limiting and payload validation applied via NestJS `ValidationPipe`.
* **API5: Broken Function Level Authorization:** Enforced via global `JwtAuthGuard` and role-specific `@Roles('admin')` guarded endpoints.
