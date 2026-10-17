import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useUser } from "@clerk/clerk-react"
import { HeroSection } from "@/sections/herosection"
import { CourseSection } from "@/sections/coursesection"
import { ShowcaseSection } from "@/sections/showcasesection"
import { courseService } from "@/services/course-service"
import { progressService, type UserProgressState } from "@/services/progress-service"
import type { Course } from "@/types/courses"

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useUser()

  const [courses, setCourses] = useState<Course[]>([])
  const [progressList, setProgressList] = useState<UserProgressState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      setLoading(true)
      try {
        const [allCourses, userProgress] = await Promise.all([
          courseService.fetchCourses(),
          user?.id ? progressService.fetchUserProgress(user.id) : Promise.resolve([]),
        ])
        if (!cancelled) {
          setCourses(allCourses)
          setProgressList(userProgress)
        }
      } catch (err) {
        console.error("Failed to load home page courses:", err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const courseProgressMap = useMemo(() => {
    const map = new Map<string | number, number>()
    for (const course of courses) {
      const allLessons = course.modules.flatMap((m) => m.lessons || [])
      if (!allLessons.length) {
        map.set(course.id, 0)
        continue
      }
      const completedCount = progressList.filter(
        (p) =>
          (p.courseId === course.slug ||
            p.courseId === String(course.id) ||
            p.courseId === `course.${course.slug}`) &&
          p.isCompleted
      ).length
      const percent = Math.round((completedCount / allLessons.length) * 100)
      map.set(course.id, percent)
    }
    return map
  }, [courses, progressList])

  const popularCourses = useMemo(() => {
    const featured = courses.filter((c) => c.isFeatured)
    return (featured.length >= 3 ? featured : courses).slice(0, 3)
  }, [courses])

  return (
    <div>
      <HeroSection />
      <CourseSection
        courses={popularCourses}
        progressMap={courseProgressMap}
        loading={loading}
        onCourseClick={(course) => navigate(`/courses/${course.id}`)}
      />
      <ShowcaseSection />
    </div>
  )
}

export default HomePage
