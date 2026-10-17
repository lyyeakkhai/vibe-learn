# Role-Based Access Control (RBAC) & Endpoint Authorization Design Specification

**Date:** 2026-10-17  
**Status:** Validated & Approved  
**Topic:** Role Separation (`admin` vs `user`), Backend API Authorization, and Frontend View Gating  

---

## 1. Problem Statement & Audit Findings

### 1.1 Backend & Database Audit Findings
1. **Missing Role Representation:**
   - The PostgreSQL `users` table currently only stores `(id, email, full_name, created_at, updated_at)`.
   - There is no `role` column, enum, or table in the database.
   - The backend `User` entity (`backend/src/modules/users/entities/user.entity.ts`) lacks a `role` property.
2. **Unrestricted Administrative Endpoints:**
   - `CoursesController` (`POST /courses`, `PUT /courses/:id`, `DELETE /courses/:id`) only enforces `ClerkAuthGuard`. Any signed-in user can mutate course data.
   - `LessonsController` (`POST /lessons`, `PATCH /lessons/:id`, `DELETE /lessons/:id`) only enforces `ClerkAuthGuard`.
   - `CourseModulesController` (`POST /course-modules`, `PATCH /course-modules/:id`, `DELETE /course-modules/:id`) only enforces `ClerkAuthGuard`.
3. **User Sync Incompleteness:**
   - Neither `ClerkAuthGuard` JIT provisioning nor `POST /users/sync` assigns or checks an `admin` role against Clerk metadata or environment configuration.

### 1.2 Frontend Component & Prop Drilling Audit Findings
1. **Unrestricted Admin Navigation:**
   - `NavigationSection` displays the `"Manage Courses"` link (`/admin/courses`) inside `<SignedIn>`, rendering it for all authenticated users regardless of privileges.
2. **Unrestricted Admin Route:**
   - In `App.tsx`, `/admin/courses` is guarded only by `<ProtectedRoute>`, which passes for any authenticated user.
3. **Hardcoding & Data Flow Verification:**
   - Static mock dataset (`mock-data.ts`) was previously removed; all course catalog and detail views load dynamically via `courseService` from the live NestJS API.
   - Course cards, lesson lists, modules, learning outcomes, and instructors pass data cleanly via props.
   - However, user authorization lacks a centralized state/context, leading to ad-hoc checks.

---

## 2. Architecture & Data Model

### 2.1 Database Schema Migration
We will add a `role` column to the `users` table:

```sql
-- Migration: Add role column with check constraint
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "role" character varying(20) NOT NULL DEFAULT 'user';

ALTER TABLE "users" 
DROP CONSTRAINT IF EXISTS "chk_users_role";

ALTER TABLE "users" 
ADD CONSTRAINT "chk_users_role" CHECK ("role" IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
```

### 2.2 Backend Entities & Types
- Update `backend/src/modules/users/entities/user.entity.ts`:
  ```typescript
  export type UserRole = 'user' | 'admin';

  @Entity('users')
  export class User {
    @PrimaryColumn('varchar', { length: 255 })
    id: string;

    @Column('varchar', { length: 255, nullable: true })
    email: string | null;

    @Column('varchar', { length: 255, nullable: true, name: 'full_name' })
    fullName: string | null;

    @Column('varchar', { length: 20, default: 'user' })
    role: UserRole;

    @OneToMany(() => Progress, (progress) => progress.user)
    progress: Progress[];

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
  }
  ```
- Update `backend/src/modules/users/types/user.types.ts`:
  ```typescript
  export interface UserProfileResponse {
    id: string;
    email: string | null;
    fullName: string | null;
    role: UserRole;
    completedLessonsCount: number;
    activeCoursesCount: number;
    createdAt: Date;
  }
  ```

---

## 3. Backend Authorization Logic

### 3.1 Role Resolution Strategy
When a user is synchronized in `ClerkAuthGuard` or `UsersService.syncUser`:
1. Check Clerk Public Metadata: `clerkUser.publicMetadata?.role === 'admin'`.
2. Check `ADMIN_EMAILS` environment variable: Comma-separated list in `.env` (e.g. `ADMIN_EMAILS=admin@vibelearn.com,dev@vibelearn.com`). If user's email is included, grant `admin`.
3. Priority: If either condition is met, `role = 'admin'`. Otherwise, `role = 'user'`.
4. Persist `role` in PostgreSQL `users` table.

### 3.2 NestJS Decorator & Guard
1. **`@Roles(...roles: UserRole[])` Decorator (`backend/src/common/decorators/roles.decorator.ts`):**
   ```typescript
   import { SetMetadata } from '@nestjs/common';
   import { UserRole } from '../../modules/users/entities/user.entity';

   export const ROLES_KEY = 'roles';
   export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
   ```
2. **`RolesGuard` (`backend/src/modules/auth/guards/roles.guard.ts`):**
   ```typescript
   import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
   import { Reflector } from '@nestjs/core';
   import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
   import { UserRole } from '../../users/entities/user.entity';

   @Injectable()
   export class RolesGuard implements CanActivate {
     constructor(private reflector: Reflector) {}

     canActivate(context: ExecutionContext): boolean {
       const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
         context.getHandler(),
         context.getClass(),
       ]);
       if (!requiredRoles || requiredRoles.length === 0) {
         return true;
       }
       const { user } = context.switchToHttp().getRequest();
       if (!user || !user.role || !requiredRoles.includes(user.role)) {
         throw new ForbiddenException('Forbidden: Insufficient administrative privileges');
       }
       return true;
     }
   }
   ```

### 3.3 Protected Controllers
1. **`CoursesController`:**
   - `POST /courses` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`
   - `PUT /courses/:id` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`
   - `DELETE /courses/:id` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`
2. **`LessonsController`:**
   - `POST /lessons` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`
   - `PATCH /lessons/:id` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`
   - `DELETE /lessons/:id` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`
3. **`CourseModulesController`:**
   - `POST /course-modules` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`
   - `PATCH /course-modules/:id` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`
   - `DELETE /course-modules/:id` -> `@UseGuards(ClerkAuthGuard, RolesGuard)`, `@Roles('admin')`

---

## 4. Frontend Role Gating & Navigation

### 4.1 Role Context & Hook (`useUserRole`)
- Create `frontend/src/hooks/use-user-role.ts`:
  - Reads `user.publicMetadata?.role` from Clerk.
  - Queries `userService.getMe()` to fetch PostgreSQL synced role.
  - Returns `{ role: 'admin' | 'user', isAdmin: boolean, isLoading: boolean }`.

### 4.2 Conditional Navigation (`NavigationSection`)
- Desktop & Mobile drawer navigation:
  - `"Courses"` and `"My Learning"` shown to all users.
  - `"Manage Courses"` rendered **only** when `isAdmin === true`.
  - Non-admin signed-in users will never see the `"Manage Courses"` link.

### 4.3 Route Guard (`AdminRoute`) & Access Denied Page (403)
- Create `frontend/src/components/auth/admin-route.tsx`:
  - If loading: renders a clean loading skeleton.
  - If signed out: redirects to Clerk sign-in.
  - If signed in and `isAdmin`: renders `<AdminCoursesPage />`.
  - If signed in and `!isAdmin`: renders `<AccessDeniedPage />`.
- Create `frontend/src/pages/access-denied-page.tsx`:
  - 403 status badge with shield/lock icon.
  - Title: "Administrator Access Required".
  - Explanatory copy that this portal is restricted to authorized course managers.
  - Action buttons: "Back to Courses" (`/courses`) and "Go Home" (`/`).

---

## 5. Verification & Acceptance Criteria

### 5.1 Automated & Quality Checks
- `npm run lint` passing in both `frontend` and `backend`.
- `npm run build` passing in both `frontend` and `backend`.
- Database schema migration applies cleanly.

### 5.2 Manual Scenarios
1. **Unauthenticated Visitor:**
   - Visits `/` and `/courses`: browses freely.
   - Visits `/admin/courses`: redirected to Clerk sign-in.
2. **Regular Authenticated Learner (`role: 'user'`):**
   - In Navigation bar and mobile menu: "Manage Courses" link is NOT rendered.
   - Direct navigation to `/admin/courses`: renders the 403 Access Denied page with navigation options.
   - Direct API request to `POST /courses`, `PUT /courses/:id`, or `DELETE /courses/:id`: rejected with HTTP 403 Forbidden.
3. **Administrator (`role: 'admin'`):**
   - In Navigation bar: "Manage Courses" link is rendered.
   - Navigating to `/admin/courses`: loads the Course Management dashboard.
   - Create, Edit, and Delete actions succeed and reflect in Supabase and the catalog.
