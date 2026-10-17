# Role-Based Access Control (RBAC) & View Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish clean separation between Admin and Normal User roles by adding a `role` column to PostgreSQL, enforcing role-based guards on backend mutation APIs (`courses`, `lessons`, `course-modules`), and providing frontend navigation gating, `AdminRoute`, and a 403 Access Denied page.

**Architecture:** 
1. Database: Add `role` column (`VARCHAR(20) NOT NULL DEFAULT 'user'`) with check constraint (`'user' | 'admin'`) to `users` table and TypeORM entity.
2. Backend: Implement `@Roles('admin')` decorator and `RolesGuard`. Update `ClerkAuthGuard` and `UsersService.syncUser` to resolve `admin` role from Clerk public metadata and `ADMIN_EMAILS` env config. Apply `RolesGuard` to `CoursesController`, `LessonsController`, and `CourseModulesController`.
3. Frontend: Provide `useUserRole` hook, update `NavigationSection` to show "Manage Courses" only to admins, wrap `/admin/courses` in `AdminRoute`, and render an Access Denied (403) page for non-admin attempts.

**Tech Stack:** React 19, Vite, TailwindCSS, Clerk React SDK, NestJS 11, TypeORM, PostgreSQL, Supabase.

## Global Constraints
- Strictly adhere to `DESIGN.md` and semantic theme tokens (`bg-primary`, `text-primary-foreground`, `bg-card`, `border-border`, `bg-background`).
- No arbitrary one-off color classes (e.g. `bg-[#123456]`).
- Do not install new dependencies.
- Ensure all quality checks pass (`npm run lint`, `npm run build`).

---

### Task 1: Database Migration and Backend Entity / Types Updates

**Files:**
- Create: `backend/src/database/migrations/1792211078259-AddUserRole.ts`
- Modify: `backend/src/modules/users/entities/user.entity.ts`
- Modify: `backend/src/modules/users/types/user.types.ts`
- Modify: `backend/src/modules/users/dto/sync-user.dto.ts`
- Modify: `supabase/schema.sql`
- Modify: `frontend/src/types/db.ts`

**Interfaces:**
- Consumes: Existing PostgreSQL `users` table and `User` entity.
- Produces: `role: UserRole` ('user' | 'admin') on `User` entity and `UserProfileResponse`.

- [ ] **Step 1: Create migration `1792211078259-AddUserRole.ts`**
  Add `role character varying(20) NOT NULL DEFAULT 'user'` column with check constraint and index.
- [ ] **Step 2: Update `User` entity**
  Add `@Column('varchar', { length: 20, default: 'user' }) role: UserRole;`
- [ ] **Step 3: Update `UserProfileResponse` in `user.types.ts` and `SyncUserDto`**
  Add `role: UserRole` to responses.
- [ ] **Step 4: Update `frontend/src/types/db.ts`**
  Add `role?: 'user' | 'admin'` to `DbUser`.
- [ ] **Step 5: Run backend typecheck and lint to verify types**
  Run: `cd backend && npm run build`
- [ ] **Step 6: Commit changes**
  Run: `git commit -m "feat(database): add role column to users table and update entities"`

---

### Task 2: Backend Role Assignment, Roles Decorator, and RolesGuard

**Files:**
- Create: `backend/src/common/decorators/roles.decorator.ts`
- Create: `backend/src/modules/auth/guards/roles.guard.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`
- Modify: `backend/src/modules/auth/guards/clerk-auth.guard.ts`
- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/src/modules/users/users.repository.ts`

**Interfaces:**
- Consumes: `Reflector`, `ClerkService`, `ConfigService`.
- Produces: `@Roles('admin')` decorator and `RolesGuard` throwing `ForbiddenException` (403) for non-admins.

- [ ] **Step 1: Create `@Roles()` decorator**
  `export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);`
- [ ] **Step 2: Create `RolesGuard`**
  Inspects handler metadata; verifies `request.user?.role` against allowed roles.
- [ ] **Step 3: Update `UsersService` & `UsersRepository`**
  Support `role?: UserRole` in `findOrCreate` and `upsertUser`.
- [ ] **Step 4: Update `ClerkAuthGuard` and `UsersService.syncUser`**
  Resolve `role` based on `clerkUser.publicMetadata?.role === 'admin'` OR `email` matching `ADMIN_EMAILS` config.
- [ ] **Step 5: Export `RolesGuard` in `AuthModule`**
- [ ] **Step 6: Run backend build to verify guard compilation**
  Run: `cd backend && npm run build`
- [ ] **Step 7: Commit changes**
  Run: `git commit -m "feat(auth): add RolesGuard, Roles decorator, and role resolution logic"`

---

### Task 3: Backend Controller Endpoint Protection

**Files:**
- Modify: `backend/src/modules/courses/courses.controller.ts`
- Modify: `backend/src/modules/lessons/lessons.controller.ts`
- Modify: `backend/src/modules/course-modules/course-modules.controller.ts`

**Interfaces:**
- Consumes: `ClerkAuthGuard`, `RolesGuard`, `@Roles('admin')`.
- Produces: Protected mutation endpoints returning 403 Forbidden for non-admin users.

- [ ] **Step 1: Protect `CoursesController`**
  Apply `@UseGuards(ClerkAuthGuard, RolesGuard)` and `@Roles('admin')` to `POST /courses`, `PUT /courses/:id`, `DELETE /courses/:id`.
- [ ] **Step 2: Protect `LessonsController`**
  Apply `@UseGuards(ClerkAuthGuard, RolesGuard)` and `@Roles('admin')` to `POST /lessons`, `PATCH /lessons/:id`, `DELETE /lessons/:id`.
- [ ] **Step 3: Protect `CourseModulesController`**
  Apply `@UseGuards(ClerkAuthGuard, RolesGuard)` and `@Roles('admin')` to `POST /course-modules`, `PATCH /course-modules/:id`, `DELETE /course-modules/:id`.
- [ ] **Step 4: Run backend tests and build**
  Run: `cd backend && npm run build`
- [ ] **Step 5: Commit changes**
  Run: `git commit -m "feat(api): guard course, module, and lesson mutation endpoints with RolesGuard"`

---

### Task 4: Frontend Role Hook and Profile Integration

**Files:**
- Modify: `frontend/src/services/user-service.ts`
- Create: `frontend/src/hooks/use-user-role.ts`

**Interfaces:**
- Consumes: Clerk `useUser()`, `userService.getMe()`.
- Produces: `useUserRole()` returning `{ role: 'admin' | 'user', isAdmin: boolean, isLoading: boolean }`.

- [ ] **Step 1: Update `userService.ts`**
  Include `role?: 'admin' | 'user'` in `UserProfile` interface and `getMe()` response parser.
- [ ] **Step 2: Create `frontend/src/hooks/use-user-role.ts`**
  Check `user.publicMetadata?.role` and fallback to `userService.getMe()`.
- [ ] **Step 3: Run frontend typecheck**
  Run: `cd frontend && npm run build`
- [ ] **Step 4: Commit changes**
  Run: `git commit -m "feat(frontend): add useUserRole hook and update user service"`

---

### Task 5: Frontend Access Denied Page and Route Guard

**Files:**
- Create: `frontend/src/pages/access-denied-page.tsx`
- Create: `frontend/src/components/auth/admin-route.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useUserRole()`, `useUser()`.
- Produces: `<AdminRoute>` protecting `/admin/courses` and rendering `<AccessDeniedPage>` on unauthorized access.

- [ ] **Step 1: Create `AccessDeniedPage`**
  Render accessible 403 screen with "Administrator Access Required", explanation, and buttons to `/courses` and `/`.
- [ ] **Step 2: Create `AdminRoute`**
  Handle loading state, redirect unauthenticated users to sign-in, allow admins, and render `AccessDeniedPage` for regular users.
- [ ] **Step 3: Update `App.tsx`**
  Wrap `/admin/courses` with `<AdminRoute>`.
- [ ] **Step 4: Run frontend build**
  Run: `cd frontend && npm run build`
- [ ] **Step 5: Commit changes**
  Run: `git commit -m "feat(frontend): add AdminRoute and AccessDeniedPage for 403 unauthorized access"`

---

### Task 6: Frontend Navigation Separation

**Files:**
- Modify: `frontend/src/sections/navigationsection.tsx`

**Interfaces:**
- Consumes: `useUserRole()`.
- Produces: Conditional rendering of "Manage Courses" link in desktop navbar and mobile drawer only when `isAdmin === true`.

- [ ] **Step 1: Import `useUserRole` in `NavigationSection`**
- [ ] **Step 2: Gate desktop "Manage Courses" link**
  Render `{isAdmin && (<Link to="/admin/courses">Manage Courses</Link>)}`.
- [ ] **Step 3: Gate mobile drawer "Manage Courses" link**
  Render `{isAdmin && (<Link to="/admin/courses">Manage Courses</Link>)}`.
- [ ] **Step 4: Verify dark mode and mobile responsiveness**
- [ ] **Step 5: Commit changes**
  Run: `git commit -m "feat(navigation): conditionally display Manage Courses link only for admin users"`

---

### Task 7: Verification and Quality Checks

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Run linter and typecheck in backend**
  Run: `cd backend && npm run lint && npm run build`
- [ ] **Step 2: Run linter and typecheck in frontend**
  Run: `cd frontend && npm run lint && npm run build`
- [ ] **Step 3: Test non-admin and admin flows**
  Verify non-admin sees no "Manage Courses" and receives 403 on `/admin/courses` and backend endpoints.
- [ ] **Step 4: Update roadmap**
  Update `docs/roadmap.md` to reflect Phase 4.8 completion.
- [ ] **Step 5: Final commit**
  Run: `git commit -m "chore: complete role-based authorization and view separation"`
