import { useState, useEffect, useRef } from "react"
import { X, Image as ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DbCourse } from "@/lib/supabase"
import type { Course } from "@/types/courses"
import { CATEGORIES } from "@/types/courses"

const LEVEL_OPTIONS = ["beginner", "intermediate", "advanced"] as const

const PRESET_IMAGES = [
  { label: "Next.js", value: "/src/assets/courses/nextjs.jpg" },
  { label: "Python", value: "/src/assets/courses/python.jpg" },
  { label: "React", value: "/src/assets/courses/react.jpg" },
  { label: "AI & LLMs", value: "/src/assets/courses/ai-llms.jpg" },
  { label: "TypeScript", value: "/src/assets/courses/typescript.jpg" },
  { label: "RAG", value: "/src/assets/courses/rag.jpg" },
  { label: "PostgreSQL", value: "/src/assets/courses/postgresql.jpg" },
  { label: "System Design", value: "/src/assets/courses/system-design.jpg" },
  { label: "DevOps", value: "/src/assets/courses/devops.jpg" },
  { label: "Web Security", value: "/src/assets/courses/web-security.jpg" },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function makeInitialForm(initialData?: Course | null): Partial<DbCourse> {
  if (initialData) {
    return {
      title: initialData.title,
      slug: initialData.slug,
      summary: initialData.description,
      category: initialData.category,
      level: (initialData.level || "intermediate").toLowerCase(),
      price: initialData.price,
      instructor_name: initialData.instructor?.name || "",
      instructor_bio: initialData.instructor?.bio || "",
      instructor_avatar: initialData.instructor?.avatar || "",
      cover_image_url: initialData.imgUrl || "",
      popular: initialData.isFeatured,
    }
  }
  return {
    title: "", slug: "", summary: "", category: "Web Development",
    level: "intermediate", price: 0, instructor_name: "",
    instructor_bio: "", instructor_avatar: "", cover_image_url: "", popular: false,
  }
}

interface CourseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<DbCourse>) => Promise<void>
  initialData?: Course | null
}

/**
 * Inner form component — receives a `key` from CourseFormModal to reset
 * all state cleanly on open/close without calling setState inside an effect.
 */
function CourseFormInner({
  isEditing,
  initialData,
  onClose,
  onSave,
}: {
  isEditing: boolean
  initialData?: Course | null
  onClose: () => void
  onSave: (data: Partial<DbCourse>) => Promise<void>
}) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Partial<DbCourse>>(makeInitialForm(initialData))
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof DbCourse, string>>>({})

  // Focus first input on mount (component remounts on each open)
  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 80)
  }, [])

  // ESC key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [saving, onClose])

  const handleTitleChange = (value: string) => {
    if (!slugManuallyEdited) {
      setForm((prev) => ({ ...prev, title: value, slug: slugify(value) }))
    } else {
      setForm((prev) => ({ ...prev, title: value }))
    }
    setFieldErrors((prev) => ({ ...prev, title: undefined }))
  }

  const validate = () => {
    const errs: Partial<Record<keyof DbCourse, string>> = {}
    if (!form.title?.trim()) errs.title = "Title is required"
    if (!form.slug?.trim()) errs.slug = "Slug is required"
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = "Slug must be lowercase letters, numbers, and hyphens only"
    if ((form.price ?? 0) < 0) errs.price = "Price cannot be negative"
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <h2 id="course-modal-title" className="font-sans text-lg font-semibold text-foreground">
          {isEditing ? "Edit Course" : "Create New Course"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            ref={firstInputRef}
            type="text"
            value={form.title || ""}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Mastering Next.js 15"
            className={cn(
              "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors",
              fieldErrors.title ? "border-destructive" : "border-border"
            )}
          />
          {fieldErrors.title && <p className="mt-1 text-xs text-destructive">{fieldErrors.title}</p>}
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Slug <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.slug || ""}
            onChange={(e) => {
              setSlugManuallyEdited(true)
              setForm((prev) => ({ ...prev, slug: e.target.value }))
              setFieldErrors((prev) => ({ ...prev, slug: undefined }))
            }}
            placeholder="e.g. mastering-nextjs-15"
            className={cn(
              "h-10 w-full rounded-md border bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors",
              fieldErrors.slug ? "border-destructive" : "border-border"
            )}
          />
          <p className="mt-1 text-xs text-muted-foreground">URL-friendly: lowercase letters, numbers, hyphens only</p>
          {fieldErrors.slug && <p className="mt-1 text-xs text-destructive">{fieldErrors.slug}</p>}
        </div>

        {/* Category + Level row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
            <select
              value={form.category || "Web Development"}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Level</label>
            <select
              value={form.level || "intermediate"}
              onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            >
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Price (USD)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price ?? 0}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                setFieldErrors((prev) => ({ ...prev, price: undefined }))
              }}
              className={cn(
                "h-10 w-full rounded-md border bg-background pl-7 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50",
                fieldErrors.price ? "border-destructive" : "border-border"
              )}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Set to 0 for a free course</p>
          {fieldErrors.price && <p className="mt-1 text-xs text-destructive">{fieldErrors.price}</p>}
        </div>

        {/* Summary */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Summary / Description</label>
          <textarea
            value={form.summary || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            rows={3}
            placeholder="A brief description of what students will learn..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Cover Image URL</label>
          <input
            type="text"
            value={form.cover_image_url || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, cover_image_url: e.target.value }))}
            placeholder="https://example.com/image.jpg or select below"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
          {/* Quick presets */}
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_IMAGES.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, cover_image_url: preset.value }))}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  form.cover_image_url === preset.value
                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                    : "border-border bg-background text-neutral-600 hover:border-primary-400 hover:text-primary-600 dark:text-neutral-400"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Image preview */}
          {form.cover_image_url && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-16 w-24 overflow-hidden rounded-lg border border-border bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={form.cover_image_url}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Preview</span>
              </div>
            </div>
          )}
        </div>

        {/* Instructor */}
        <div className="rounded-lg border border-border bg-neutral-50 p-4 dark:bg-neutral-900/50">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Instructor Details</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={form.instructor_name || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, instructor_name: e.target.value }))}
                placeholder="e.g. Sarah Johnson"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Avatar URL</label>
              <input
                type="text"
                value={form.instructor_avatar || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, instructor_avatar: e.target.value }))}
                placeholder="https://example.com/avatar.jpg"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Bio</label>
              <textarea
                value={form.instructor_bio || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, instructor_bio: e.target.value }))}
                rows={2}
                placeholder="Short bio about the instructor..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Popular toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(form.popular)}
            onClick={() => setForm((prev) => ({ ...prev, popular: !prev.popular }))}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              form.popular ? "bg-primary-500" : "bg-neutral-300 dark:bg-neutral-600"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform",
                form.popular ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
          <div>
            <p className="text-sm font-medium text-foreground">Featured / Popular</p>
            <p className="text-xs text-muted-foreground">Mark this course as popular in the catalog</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : isEditing ? "Update Course" : "Save Course"}
          </button>
        </div>
      </form>
    </>
  )
}

/**
 * Outer modal wrapper — passes a `key` to CourseFormInner so state resets
 * cleanly on each open/close without calling setState inside an effect.
 */
export function CourseFormModal({ isOpen, onClose, onSave, initialData }: CourseFormModalProps) {
  const isEditing = Boolean(initialData)
  // Use a key that changes every time the modal opens or the target changes.
  // This causes CourseFormInner to fully remount (clean state) instead of
  // trying to sync state via a useEffect.
  const innerKey = isOpen ? (initialData ? String(initialData.id) : "new") : "closed"

  // ESC on the backdrop layer (outer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="course-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        <CourseFormInner
          key={innerKey}
          isEditing={isEditing}
          initialData={initialData}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  )
}

export default CourseFormModal
