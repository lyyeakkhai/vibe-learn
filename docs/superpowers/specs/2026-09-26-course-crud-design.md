# Course Management Protected Route (CRUD) Design Specification

**Date:** 2026-09-26  
**Status:** Approved  
**Topic:** Course CRUD Protected Route and Supabase Database Synchronization  

---

## 1. Overview & Goal

The goal of this feature is to provide an authenticated, protected administrative interface in Vibelearn at `/admin/courses` that allows authorized users to perform full CRUD operations (Create, Read, Update, Delete) on courses with live synchronization to the Supabase PostgreSQL database.

---

## 2. Requirements & Constraints

1. **Authentication & Protection:**
   - The route `/admin/courses` must be protected using Clerk authentication via `<ProtectedRoute>`.
   - Unauthenticated visitors attempting to access the route must be redirected to the sign-in flow.
   - A direct link "Manage Courses" must be visible in the main navigation bar (`NavigationSection`) and mobile drawer for signed-in users.

2. **Scope of Management:**
   - Scope is restricted to course-level metadata: Title, Slug, Summary/Description, Category, Level, Price, Instructor Name, Instructor Bio, Instructor Avatar, Cover Image URL, and Popular status.
   - Nested modules and lessons remain seeded or managed separately in subsequent phases.

3. **Database Synchronization:**
   - Directly query and persist changes to the Supabase `public.courses` table using the existing client (`src/lib/supabase.ts`).
   - If Supabase is offline or unconfigured, gracefully surface feedback while allowing preview/optimistic state updates.

4. **UI & Design System Alignment:**
   - Strictly follow the `DESIGN.md` and `src/globals.css` design system (Inter for body/UI, Playfair Display for display headers, semantic tokens like `bg-primary`, `bg-card`, `border-border`, `text-neutral-*`).
   - Master table view with search filter, category filter, summary metric cards, modal form dialog for Create/Edit, and confirmation dialog for Delete.

---

## 3. Architecture & Routing

### 3.1 Route Registration (`src/App.tsx`)
```tsx
<Route
  path="admin/courses"
  element={
    <ProtectedRoute>
      <AdminCoursesPage />
    </ProtectedRoute>
  }
/>
```

### 3.2 Header Navigation Link (`src/sections/navigationsection.tsx`)
Inside `<SignedIn>`, alongside "Courses" and "My Learning":
```tsx
<Link
  to="/admin/courses"
  className={cn(
    "relative flex h-full items-center text-sm font-medium transition-colors hover:text-neutral-900 dark:hover:text-white",
    isAdminCoursesActive ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
  )}
>
  Manage Courses
  {isAdminCoursesActive && (
    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-primary-500" />
  )}
</Link>
```
Also added to the mobile navigation drawer.

---

## 4. Service Layer (`src/services/course-service.ts`)

Extend `courseService` with three mutation methods:

1. `createCourse(courseData: Partial<DbCourse>): Promise<Course>`
   - Validates `title` and `slug`.
   - Generates unique ID (`course_${slug}` or random UUID string).
   - Inserts row into `public.courses` table via `supabase.from("courses").insert(newDbCourse).select().single()`.
   - Returns mapped `Course` object.

2. `updateCourse(id: string, updates: Partial<DbCourse>): Promise<Course>`
   - Updates row in `public.courses` matching `id`.
   - Returns mapped updated `Course` object.

3. `deleteCourse(id: string): Promise<boolean>`
   - Removes row in `public.courses` matching `id` via `supabase.from("courses").delete().eq("id", id)`.
   - Returns true on success.

---

## 5. UI Components & Interactions

### 5.1 Admin Courses Page (`src/pages/admin-courses-page.tsx`)
- **Metric Cards:** Total Courses, Featured/Popular count, Free vs Paid distribution.
- **Action Toolbar:** 
  - Search input (filters by title, slug, or instructor name).
  - Category selector filter.
  - "+ New Course" button triggering modal with clean state.
- **Courses Table:**
  - Table headers: Thumbnail & Course Title, Category, Level, Price, Instructor, Featured status, Actions.
  - Action buttons:
    - View Live (`/courses/:slug`)
    - Edit (opens modal populated with current course)
    - Delete (opens confirmation modal)
  - Responsive overflow handling for table on mobile/tablet viewports.

### 5.2 Course Form Modal (`CourseModal`)
- Modal Dialog with backdrop blur and accessible keyboard escape handling.
- Fields:
  - `Title` (required, auto-populates slug if slug is empty)
  - `Slug` (required, lowercase alphanumeric with hyphens)
  - `Category` (Web Development, AI & Machine Learning, Data Science, DevOps, Mobile, etc.)
  - `Level` (Beginner, Intermediate, Advanced)
  - `Price` (Numeric, default 0 for Free)
  - `Summary` (Multi-line description)
  - `Instructor Name`, `Instructor Bio`, `Instructor Avatar URL`
  - `Cover Image URL` (Input with live preview and quick preset selectors from existing course assets: e.g. `/src/assets/courses/nextjs.jpg`, `/src/assets/courses/ai-llms.jpg`, etc.)
  - `Popular` (Checkbox / switch toggle)
- Buttons: "Cancel" and "Save Course" (with saving loading spinner).
- Inline error banner for submission errors.

### 5.3 Delete Confirmation Dialog (`DeleteConfirmModal`)
- Warning dialog detailing the course title to be deleted.
- "Delete Course" (destructive red button) and "Cancel".

---

## 6. Error Handling & Edge Cases

1. **Duplicate Slugs:** Supabase unique index will reject duplicate slugs; the UI catches this error and highlights the slug input field.
2. **Missing Supabase Configuration:** If `isSupabaseConfigured` is false or network fails, displays a friendly warning banner indicating that local state is updated optimistically.
3. **Empty States:** When search yields no results or no courses exist, displays a clean empty state with an invitation to create the first course.
4. **Loading States:** Skeletons during initial fetch; disabled buttons with spinners during save/delete actions.

---

## 7. Verification & Testing Plan

1. **Typecheck & Lint:**
   - Execute `npm run lint` and `npm run typecheck` to confirm zero TypeScript errors and code style adherence.
2. **Authentication Guard Test:**
   - Visit `/admin/courses` unauthenticated -> confirm redirected to Clerk Sign In.
   - Sign in as authenticated user -> confirm `/admin/courses` loads with title "Course Management".
3. **Create Operation:**
   - Click "+ New Course", enter details (Title: "Mastering Rust for Systems", Category: "Systems", Price: 49.99).
   - Save -> verify new row appears in table and persisted in Supabase database.
4. **Update Operation:**
   - Click "Edit", modify price to 39.99 and toggle "Popular".
   - Save -> verify updated values reflected immediately in table.
5. **Catalog Synchronization:**
   - Navigate to public `/courses` catalog page -> verify the new course appears in the grid.
6. **Delete Operation:**
   - Return to `/admin/courses`, click delete on the test course, confirm prompt.
   - Verify course is removed from table and Supabase database.
