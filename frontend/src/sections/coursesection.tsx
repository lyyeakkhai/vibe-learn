import { useNavigate } from "react-router-dom"
import { CourseCard } from "@/components/common/course-card"
import { cn } from "@/lib/utils"
import type { Course } from "@/types/courses"

type CourseSectionProps = {
  courses?: Course[]
  progressMap?: Map<string | number, number>
  loading?: boolean
  onCourseClick?: (course: Course) => void
}

export function CourseSection({
  courses = [],
  progressMap,
  loading = false,
  onCourseClick,
}: CourseSectionProps) {
  const navigate = useNavigate()
  const handleCourseClick =
    onCourseClick || ((course: Course) => navigate(`/courses/${course.id}`))

  return (
    <section id="courses" className="bg-emerald-50/30 px-4 py-20 sm:px-6 dark:bg-emerald-950/10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-xl">
            <p className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-emerald-600 uppercase dark:text-emerald-400">
              <span className="h-0.5 w-8 rounded-full bg-emerald-500" />
              Our Courses
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              Popular Learning Paths
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-500 dark:text-slate-400">
              Choose from our curated courses and start your journey towards new skills and better
              opportunities.
            </p>
          </div>

          <LearnGrowAchieve className="hidden shrink-0 md:block" />
        </div>

        {loading ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 animate-pulse rounded-3xl border border-neutral-200 bg-neutral-100/80 p-6 dark:border-neutral-800 dark:bg-neutral-900/60"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-800">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No courses available at this time.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={progressMap?.get(course.id) || 0}
                onClick={() => handleCourseClick(course)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function LearnGrowAchieve({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative -rotate-12 font-['Caveat',cursive] text-4xl leading-none font-bold text-emerald-500",
        className
      )}
    >
      <span className="block">Learn</span>
      <span className="block pl-6">Grow</span>
      <span className="block pl-2">Achieve</span>
      <svg viewBox="0 0 140 24" fill="none" className="mt-1 w-36">
        <path d="M4 18 C 40 6, 90 4, 136 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" className="absolute top-8 -right-6 size-6">
        <path d="M4 12 L20 6 M6 18 L20 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}
