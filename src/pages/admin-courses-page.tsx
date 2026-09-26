import { useState, useEffect, useMemo, useCallback } from "react"
import { Link } from "react-router-dom"
import { useUser } from "@clerk/clerk-react"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  BookOpen,
  Star,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { courseService } from "@/services/course-service"
import { CourseFormModal } from "@/components/admin/course-form-modal"
import { DeleteConfirmModal } from "@/components/admin/delete-confirm-modal"
import type { Course } from "@/types/courses"
import type { DbCourse } from "@/lib/supabase"
import { CATEGORIES } from "@/types/courses"

interface Toast {
  id: number
  type: "success" | "error"
  message: string
}

// ── Small helper components ─────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  iconClass: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main Page Component ──────────────────────────────────────────────────────

export function AdminCoursesPage() {
  const { isLoaded, isSignedIn } = useUser()

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")

  // Modal state
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null)

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([])
  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  // Load courses
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const all = await courseService.fetchCourses()
        if (!cancelled) setCourses(all)
      } catch (err) {
        if (!cancelled) addToast("error", "Failed to load courses. Please refresh.")
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, addToast])

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalCourses = courses.length
  const popularCourses = courses.filter((c) => c.isFeatured).length
  const freeCourses = courses.filter((c) => c.isFree).length

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    const q = search.toLowerCase()
    return courses.filter((c) => {
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.instructor?.name?.toLowerCase().includes(q)
      const matchesCategory =
        categoryFilter === "All" || c.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [courses, search, categoryFilter])

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingCourse(null)
    setFormModalOpen(true)
  }

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course)
    setFormModalOpen(true)
  }

  const handleOpenDelete = (course: Course) => {
    setDeletingCourse(course)
    setDeleteModalOpen(true)
  }

  const handleSave = async (data: Partial<DbCourse>) => {
    if (editingCourse) {
      const updated = await courseService.updateCourse(editingCourse.id, data)
      setCourses((prev) =>
        prev.map((c) => (String(c.id) === String(editingCourse.id) ? updated : c))
      )
      addToast("success", `"${updated.title}" updated successfully.`)
    } else {
      const created = await courseService.createCourse(data)
      setCourses((prev) => [...prev, created])
      addToast("success", `"${created.title}" created successfully.`)
    }
  }

  const handleDelete = async () => {
    if (!deletingCourse) return
    await courseService.deleteCourse(deletingCourse.id)
    setCourses((prev) =>
      prev.filter((c) => String(c.id) !== String(deletingCourse.id))
    )
    addToast("success", `"${deletingCourse.title}" deleted.`)
    setDeletingCourse(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Toast notifications ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm",
              toast.type === "success"
                ? "border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-800/40 dark:bg-primary-950/80 dark:text-primary-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-950/80 dark:text-red-200"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-auto rounded p-0.5 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mb-2 inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
            Admin Dashboard
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Course Management
          </h1>
          <p className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
            Create, view, update, and delete courses synced directly with Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          New Course
        </button>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────────────────── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Courses"
          value={totalCourses}
          sub="In catalog"
          icon={BookOpen}
          iconClass="bg-primary-100 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400"
        />
        <MetricCard
          label="Featured Courses"
          value={popularCourses}
          sub={`${totalCourses - popularCourses} standard`}
          icon={Star}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
        <MetricCard
          label="Free Courses"
          value={freeCourses}
          sub={`${totalCourses - freeCourses} paid`}
          icon={DollarSign}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
      </div>

      {/* ── Filter Toolbar ────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, slug, or instructor…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* ── Courses Table ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 animate-pulse rounded-xl border border-border bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-base font-semibold text-foreground">No courses found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || categoryFilter !== "All"
              ? "Try adjusting your search or filter"
              : "Get started by creating your first course"}
          </p>
          {!search && categoryFilter === "All" && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" />
              New Course
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Table (desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-neutral-50 dark:bg-neutral-900/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category & Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instructor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCourses.map((course) => (
                  <CourseTableRow
                    key={course.id}
                    course={course}
                    onEdit={() => handleOpenEdit(course)}
                    onDelete={() => handleOpenDelete(course)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Card list (mobile) */}
          <div className="divide-y divide-border md:hidden">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={() => handleOpenEdit(course)}
                onDelete={() => handleOpenDelete(course)}
              />
            ))}
          </div>

          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Showing {filteredCourses.length} of {totalCourses} course{totalCourses !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <CourseFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSave}
        initialData={editingCourse}
      />

      {deletingCourse && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false)
            setDeletingCourse(null)
          }}
          onConfirm={handleDelete}
          courseTitle={deletingCourse.title}
        />
      )}
    </div>
  )
}

// ── Table Row (Desktop) ────────────────────────────────────────────────────

function CourseTableRow({
  course,
  onEdit,
  onDelete,
}: {
  course: Course
  onEdit: () => void
  onDelete: () => void
}) {
  const levelColor = {
    Beginner: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
    Intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    Advanced: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  }[course.level] || "bg-neutral-100 text-neutral-600"

  return (
    <tr className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/40">
      {/* Course */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-neutral-100 dark:bg-neutral-800">
            {course.imgUrl ? (
              <img
                src={course.imgUrl}
                alt={course.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-5 w-5 text-neutral-400" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground line-clamp-1">{course.title}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">/{course.slug}</p>
          </div>
        </div>
      </td>

      {/* Category & Level */}
      <td className="px-4 py-4">
        <p className="text-sm text-foreground">{course.category}</p>
        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", levelColor)}>
          {course.level}
        </span>
      </td>

      {/* Price */}
      <td className="px-4 py-4">
        {course.isFree ? (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
            Free
          </span>
        ) : (
          <span className="text-sm font-semibold text-foreground">
            ${course.price.toFixed(2)}
          </span>
        )}
      </td>

      {/* Instructor */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {course.instructor?.avatar && (
            <img
              src={course.instructor.avatar}
              alt={course.instructor.name}
              className="h-7 w-7 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none"
              }}
            />
          )}
          <span className="text-sm text-foreground line-clamp-1">{course.instructor?.name || "—"}</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        {course.isFeatured ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Star className="h-3 w-3 fill-current" />
            Popular
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Standard</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/courses/${course.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
            title="View live page"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400"
            title="Edit course"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            title="Delete course"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Mobile Card ────────────────────────────────────────────────────────────

function CourseCard({
  course,
  onEdit,
  onDelete,
}: {
  course: Course
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex gap-3 p-4">
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-neutral-100 dark:bg-neutral-800">
        {course.imgUrl ? (
          <img
            src={course.imgUrl}
            alt={course.title}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-5 w-5 text-neutral-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground line-clamp-1">{course.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{course.category} · {course.level}</p>
        <div className="mt-1 flex items-center gap-2">
          {course.isFree ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">Free</span>
          ) : (
            <span className="text-xs font-semibold text-foreground">${course.price.toFixed(2)}</span>
          )}
          {course.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <Star className="h-2.5 w-2.5 fill-current" />
              Popular
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-400"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default AdminCoursesPage
