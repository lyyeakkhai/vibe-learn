# Vibelearn Implementation Roadmap

This roadmap defines the strict order of implementation for the Vibelearn project. 

**AI INSTRUCTION:** When implementing this project, you must follow this roadmap sequentially. Do not skip phases or combine tasks unless explicitly instructed by the user. Before writing code for any phase, create the implementation prompt in `prompts/` and get user approval as per `AGENTS.md`.

---

## Phase 1: Foundation (Repo Setup)
**Goal:** Initialize the monorepo structure and establish the core technology stack.

- [ ] 1.1: Initialize `frontend` folder with Vite (React, JavaScript).
- [ ] 1.2: Initialize `backend` folder with Node.js (Express, JavaScript).
- [ ] 1.3: Setup TailwindCSS in the `frontend`.
- [ ] 1.4: Configure ESLint and Prettier across both workspaces.
- [ ] 1.5: Create `.env.example` in both `frontend` and `backend` (stubs for Clerk, Supabase, API URLs).
- [ ] 1.6: Verify both development servers start successfully (`npm run dev`).
- [ ] 1.7: **CHECKPOINT:** Get user approval before moving to the frontend.

## Phase 2: Frontend First (UI & Layouts)
**Goal:** Build the complete UI using mock data before touching the backend.

- [ ] 2.1: Draft and finalize `docs/system_design/DESIGN.md` to establish UI consistency guidelines.
- [x] 2.2: Implement the global design system (typography, colors) in Tailwind.
- [x] 2.3: Integrate Clerk React SDK into the `frontend` for Sign Up / Log In UI.
  - [x] Custom Clerk UI and appearance styling for Sign In and Sign Up pages aligned with Vibe Learn theme.
- [x] 2.4: Protect specific frontend routes (e.g., `/my-learning`) using Clerk components.
- [x] 2.5: Build the Public Catalog Page (using mock course data).
  - [x] Implement the reference hero with responsive layout, learning illustration, and Explore Courses anchor.
  - [x] Generate custom course images for all 10 courses based on their content.
- [x] 2.6: Build the Course Detail Page (using mock module/lesson data).
- [x] 2.7: Build the Lesson Page UI (YouTube embed, curriculum sidebar, text notes).
- [x] 2.8: Build the "My Learning" Dashboard (`src/pages/my-learning-page.tsx`).
- [x] 2.9: Ensure mobile responsiveness across all pages.
- [x] 2.10: **CHECKPOINT:** Perform a full UI audit against the provided reference images and verify auth flows.

## Phase 3: Backend & Database
**Goal:** Create the database schema, seed data, and expose the APIs.

- [x] 3.1: Setup Supabase connection using credentials in `.env` (`src/lib/supabase.ts`).
- [x] 3.2: Design and define PostgreSQL schema (`users`, `courses`, `modules`, `lessons`, `progress`).
- [x] 3.3: Generate initial database migration script (`supabase/migrations/01_initial_schema.sql`).
- [x] 3.4: Write and execute seeding script (`scripts/seed-supabase.js` and `supabase/seed.sql`) parsing `docs/seed.ndjson` and `docs/videos.json`.
- [x] 3.5: Create read-only CRUD services (`courseService.fetchCourses`, `fetchCourseBySlug`, `fetchLessonBySlug`).
- [x] 3.6: Create progress tracking CRUD services (`progressService.fetchUserProgress`, `upsertProgress`, `markLessonComplete`).
- [x] 3.7: **CHECKPOINT:** Verify Supabase PostgREST client connection, schema, and CRUD services.

## Phase 4: Integration (Auth & Data Hookup)
**Goal:** Secure the application and connect the frontend to the real backend APIs.

- [x] 4.1: Setup Clerk authentication & user sync provider (`UserSyncProvider`).
- [x] 4.2: Swap frontend mock data with real data calls via `courseService` across catalog, course detail, and lesson pages.
- [x] 4.3: Integrate progress tracking: periodically save video timestamps to `progressService` and implement interactive "Mark as Complete".
- [x] 4.4: **CHECKPOINT:** End-to-end testing: User can log in, watch a video, leave, and resume from the saved timestamp.
- [x] 4.5: Build protected `/admin/courses` page with full course CRUD (Create, Read, Update, Delete) synced directly with Supabase. Includes `courseService.createCourse`, `updateCourse`, `deleteCourse` methods, `CourseFormModal`, `DeleteConfirmModal`, and "Manage Courses" navigation link for signed-in users.
- [x] 4.6: Complete removal of static mock dataset (`mock-data.ts`), eliminate mock fallbacks in `courseService`, and wire all frontend views (`HomePage`, `CourseDetailPage`, `LearningPage`) with loading skeletons directly to the live NestJS backend API.
- [x] 4.7: Environment variable validation with Zod across frontend (`src/config/env.ts`) and backend (`src/config/env.validation.ts`), ensuring fail-fast startup, strict type inference, and centralized configuration.
- [x] 4.8: Integrate Cloudinary image storage for course cover images and instructor avatars in course management (NestJS `MediaModule`, `POST /api/media/upload` in-memory buffer streaming, and frontend `ImageUploader` component in `CourseFormModal`).
- [x] 4.9: Role-Based Access Control (RBAC) & View Separation: Added `role` column (`'user' | 'admin'`) to PostgreSQL `users` table via migration, implemented `RolesGuard` and `@Roles('admin')` protecting course, module, and lesson mutation endpoints in NestJS, and added frontend `useUserRole` hook, `AdminRoute` with 403 `AccessDeniedPage`, and navigation gating.
- [x] 4.10: Upload custom course logo images to Cloudinary and update Supabase course records (`cover_image_url`), synchronizing live database and seed assets (`supabase/seed.sql`, `backend/docs/seed.ndjson`).
- [x] 4.11: Fix progress tracking course UUID vs slug resolution and validation: added bidirectional course UUID and slug lookup in NestJS backend (`ProgressModule`, `ProgressService`, `ProgressRepository`, `UpsertProgressDto`, `ToggleCompleteDto`) and aligned course identifier passing in frontend (`CourseDetailPage`, `LearningPage`).
- [x] 4.12: Live HTTP Request Logging & 1-Click Demo Auth Mode: Added live HTTP console logger middleware in NestJS (`[HTTP] <METHOD> <URL> <STATUS> - <TIME>ms`), 4xx warning logger in `HttpExceptionFilter`, and seamless dev auth bypass.
- [x] 4.13: Decouple & Remove Clerk Authentication: Completely uninstalled `@clerk/clerk-react` and `@clerk/backend`, replaced ClerkProvider with clean native React `AuthProvider` / `useAuth` / `useUser`, converted backend to decoupled `AuthGuard`, removed Clerk env requirements, and prepared the platform for custom course auth implementation.
- [x] 4.14: Native Authentication Lab & Scoped Progress: Implemented User entity with argon2 password hashing and hashed refresh tokens, TypeORM migrations, POST /api/auth/signup (409 Conflict check), POST /api/auth/login (JWT access token), POST /api/auth/refresh (HttpOnly cookie rotation), POST /api/auth/logout, global JwtAuthGuard with @Public() exception, @CurrentUser() parameter decorator, scoped learner Progress tracking with user ownership isolation, RBAC with RolesGuard (@Roles('admin')), and React AuthContext with Bearer token Axios interceptor. Removed legacy sample todo references for a clean course-centric architecture.

## Phase 5: Deployment
**Goal:** Deploy the application to production.

- [x] 5.1: Run linting and typecheck on the application.
- [x] 5.2: Prepare deployment configurations for Vercel (`vercel.json`).
- [ ] 5.3: Prepare deployment configurations for Render (Backend).
- [ ] 5.4: Deploy and verify production environment variables.
- [ ] 5.5: **CHECKPOINT:** Project is live and fully functional.
