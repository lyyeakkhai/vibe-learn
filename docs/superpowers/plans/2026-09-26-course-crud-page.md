# Course Management Protected Route (CRUD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an authenticated protected route at `/admin/courses` that provides full CRUD functionality for courses and synchronizes with the Supabase PostgreSQL database.

**Architecture:** Extend the existing frontend React application with a protected administrative route (`/admin/courses`) wrapped in `<ProtectedRoute>`, expand `courseService` to execute PostgreSQL insert, update, and delete queries via Supabase client with optimistic local updates, and present a responsive master table with search, filters, and modal form dialogs styled per `DESIGN.md`.

**Tech Stack:** React 19, TypeScript, React Router v7, Clerk Auth (`@clerk/clerk-react`), Supabase JS Client (`@supabase/supabase-js`), Tailwind CSS v4, Lucide React icons.

## Global Constraints

- Follow semantic theme tokens from `src/globals.css` and `DESIGN.md` (e.g., `bg-primary`, `bg-card`, `border-border`, `text-neutral-900`, `font-sans`, `font-display`).
- Do NOT install any extra external packages.
- Protect route with `<ProtectedRoute>` from `src/components/auth/protected-route.tsx`.
- Scope CRUD strictly to course metadata (Title, Slug, Summary, Category, Level, Price, Instructor Name, Instructor Bio, Instructor Avatar, Cover Image URL, Popular).
- Keep all writes synchronized with Supabase `public.courses`.

---

### Task 1: Extend `courseService` with Course Mutations

**Files:**
- Modify: `src/services/course-service.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`, `DbCourse` from `src/lib/supabase.ts`, `Course` from `src/types/courses.ts`.
- Produces: 
  - `courseService.createCourse(courseData: Partial<DbCourse>): Promise<Course>`
  - `courseService.updateCourse(id: string | number, updates: Partial<DbCourse>): Promise<Course>`
  - `courseService.deleteCourse(id: string | number): Promise<boolean>`

- [ ] **Step 1: Implement `createCourse` in `src/services/course-service.ts`**
Add `createCourse` method to `courseService`:
```typescript
async createCourse(data: Partial<DbCourse>): Promise<Course> {
  const courseId = data.id || `course_${Date.now()}`;
  const slug = data.slug || data.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `course-${Date.now()}`;
  
  const newDbCourse: DbCourse = {
    id: courseId,
    slug,
    title: data.title || "Untitled Course",
    summary: data.summary || "",
    cover_image_url: data.cover_image_url || "/src/assets/courses/nextjs.jpg",
    category: data.category || "Web Development",
    instructor_name: data.instructor_name || "Lead Instructor",
    instructor_bio: data.instructor_bio || "",
    instructor_avatar: data.instructor_avatar || "",
    level: data.level || "intermediate",
    price: data.price !== undefined ? Number(data.price) : 0,
    popular: Boolean(data.popular),
    student_count: data.student_count || 0,
    learning_outcomes: data.learning_outcomes || [],
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    const { data: inserted, error } = await supabase
      .from("courses")
      .insert(newDbCourse)
      .select()
      .single();

    if (error) {
      console.error("Supabase createCourse error:", error);
      throw new Error(error.message || "Failed to create course in database");
    }
    return mapDbToCourse(inserted as DbCourse, [], []);
  }

  return mapDbToCourse(newDbCourse, [], []);
}
```

- [ ] **Step 2: Implement `updateCourse` in `src/services/course-service.ts`**
Add `updateCourse` method to `courseService`:
```typescript
async updateCourse(id: string | number, updates: Partial<DbCourse>): Promise<Course> {
  const targetId = String(id);
  const sanitizedUpdates: Partial<DbCourse> = { ...updates };
  delete sanitizedUpdates.id;
  delete sanitizedUpdates.created_at;

  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from("courses")
      .update(sanitizedUpdates)
      .eq("id", targetId)
      .select()
      .single();

    if (error) {
      console.error("Supabase updateCourse error:", error);
      throw new Error(error.message || "Failed to update course in database");
    }
    return mapDbToCourse(updated as DbCourse, [], []);
  }

  const existing = await this.fetchCourseById(targetId);
  if (!existing) {
    throw new Error(`Course ${targetId} not found`);
  }
  return {
    ...existing,
    title: updates.title ?? existing.title,
    slug: updates.slug ?? existing.slug,
    description: updates.summary ?? existing.description,
    category: updates.category ?? existing.category,
    price: updates.price !== undefined ? Number(updates.price) : existing.price,
    imgUrl: updates.cover_image_url ?? existing.imgUrl,
  };
}
```

- [ ] **Step 3: Implement `deleteCourse` in `src/services/course-service.ts`**
Add `deleteCourse` method to `courseService`:
```typescript
async deleteCourse(id: string | number): Promise<boolean> {
  const targetId = String(id);
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", targetId);

    if (error) {
      console.error("Supabase deleteCourse error:", error);
      throw new Error(error.message || "Failed to delete course from database");
    }
  }
  return true;
}
```

- [ ] **Step 4: Run typecheck to verify interface correctness**
Run: `npm run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit changes**
Run: `git commit -am "feat: add create, update, delete methods to courseService"`

---

### Task 2: Build Course Form and Delete Confirmation Modals

**Files:**
- Create: `src/components/admin/course-form-modal.tsx`
- Create: `src/components/admin/delete-confirm-modal.tsx`

**Interfaces:**
- Consumes: `Course` from `src/types/courses.ts`, `DbCourse` from `src/lib/supabase.ts`.
- Produces:
  - `<CourseFormModal isOpen={boolean} onClose={() => void} onSave={(data) => Promise<void>} initialData?: Course | null />`
  - `<DeleteConfirmModal isOpen={boolean} onClose={() => void} onConfirm={() => Promise<void>} courseTitle: string />`

- [ ] **Step 1: Create `src/components/admin/course-form-modal.tsx`**
Implement the modal with:
- Accessible overlay with ESC key handling and backdrop click close.
- Form inputs:
  - Title (required; triggers slug auto-generation on blur if slug empty)
  - Slug (required; sanitized lowercase string)
  - Category (select or text input)
  - Level ("Beginner" | "Intermediate" | "Advanced")
  - Price (numeric USD input, 0 is Free)
  - Cover Image URL (with image preview thumbnail and quick preset buttons for existing asset images: `/src/assets/courses/nextjs.jpg`, `/src/assets/courses/python.jpg`, etc.)
  - Instructor Name, Instructor Avatar URL, Instructor Bio
  - Summary / Description (textarea)
  - Popular / Featured checkbox toggle
- Error display alert if submission errors occur.
- Disabled buttons + loading spinner while saving.

- [ ] **Step 2: Create `src/components/admin/delete-confirm-modal.tsx`**
Implement the confirmation modal:
- Danger prompt: "Are you sure you want to delete **{courseTitle}**? This action will permanently remove it from the catalog and database."
- "Cancel" button and "Delete Course" button (styled with destructive red classes `bg-red-600 hover:bg-red-700 text-white`).
- Loading spinner state during deletion.

- [ ] **Step 3: Run typecheck and lint on modals**
Run: `npm run typecheck && npm run lint`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit changes**
Run: `git add src/components/admin && git commit -m "feat: add course form and delete confirmation modals"`

---

### Task 3: Build Admin Course Management Page

**Files:**
- Create: `src/pages/admin-courses-page.tsx`

**Interfaces:**
- Consumes: `courseService` from `src/services/course-service.ts`, `CourseFormModal`, `DeleteConfirmModal`, `Course` from `src/types/courses.ts`.
- Produces: `AdminCoursesPage` default component.

- [ ] **Step 1: Create `src/pages/admin-courses-page.tsx`**
Implement the page with:
- **Header:**
  - Badge: "ADMIN DASHBOARD"
  - Display Title: "Course Management" (font-display)
  - Description: "Manage, create, update, and delete courses synced directly with Supabase."
  - Action button: `+ New Course` (opens modal with `initialData = null`)
- **Metric Cards (3 cards):**
  - Total Courses
  - Popular / Featured Courses
  - Free Courses vs Paid Courses
- **Toolbar:**
  - Search input (debounced or real-time filtering on title, slug, instructor)
  - Category dropdown filter
- **Table / Grid:**
  - Column 1: Cover image preview + Course Title & Slug
  - Column 2: Category & Level badges
  - Column 3: Price badge (Free or `$XX.XX`)
  - Column 4: Instructor name + Avatar
  - Column 5: Status (Featured pill if popular)
  - Column 6: Actions:
    - View live link (`/courses/:slug` or `/courses/:id`)
    - Edit button (opens modal with `initialData = course`)
    - Delete button (opens `DeleteConfirmModal`)
- Empty state if no courses match search or if list is empty.
- Success / error banner feedback.

- [ ] **Step 2: Verify typecheck & lint**
Run: `npm run typecheck && npm run lint`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit changes**
Run: `git add src/pages/admin-courses-page.tsx && git commit -m "feat: implement AdminCoursesPage component"`

---

### Task 4: Register Route & Navigation Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/sections/navigationsection.tsx`

**Interfaces:**
- Consumes: `AdminCoursesPage` from `src/pages/admin-courses-page.tsx`, `ProtectedRoute` from `src/components/auth/protected-route.tsx`.

- [ ] **Step 1: Add `/admin/courses` route in `src/App.tsx`**
Import `AdminCoursesPage` and register protected route:
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

- [ ] **Step 2: Add "Manage Courses" link in `src/sections/navigationsection.tsx`**
Inside `<SignedIn>`, add nav link in desktop navbar:
```tsx
<Link
  to="/admin/courses"
  className={cn(
    "relative flex h-full items-center text-sm font-medium transition-colors hover:text-neutral-900 dark:hover:text-white",
    isAdminCoursesActive
      ? "font-semibold text-neutral-900 dark:text-white"
      : "text-neutral-500 dark:text-neutral-400"
  )}
>
  Manage Courses
  {isAdminCoursesActive && (
    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-primary-500" />
  )}
</Link>
```
And add "Manage Courses" link inside the mobile drawer under `<SignedIn>`.

- [ ] **Step 3: Verify typecheck & lint**
Run: `npm run typecheck && npm run lint`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit changes**
Run: `git commit -am "feat: register admin/courses route and add navigation links"`

---

### Task 5: End-to-End Verification & Documentation

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Run complete project check**
Run: `npm run lint && npm run typecheck && npm run build`
Expected: All build commands succeed with 0 warnings/errors.

- [ ] **Step 2: End-to-end verification checklist**
1. Unauthenticated test: Visit `/admin/courses` -> redirected to Clerk sign-in.
2. Authenticated test: Sign in -> `/admin/courses` renders table with all existing courses.
3. Create course test: Click `+ New Course`, create "Mastering Fullstack AI", save -> verify added to table and catalog.
4. Update course test: Edit "Mastering Fullstack AI" price to $29.99, save -> verify updated in table.
5. Delete course test: Click delete, confirm -> verify removed from table and database.

- [ ] **Step 3: Update `docs/roadmap.md` and commit**
Run: `git commit -am "docs: update roadmap and complete course CRUD protected route"`
