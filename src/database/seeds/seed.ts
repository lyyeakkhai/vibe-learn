import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import AppDataSource from '../data-source';
import { Course } from '../../modules/courses/entities/course.entity';
import { CourseModule } from '../../modules/course-modules/entities/course-module.entity';
import { Lesson } from '../../modules/lessons/entities/lesson.entity';

function extractPlainTextFromBlocks(blocks: any[]): string {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map((b) => {
      if (b.children && Array.isArray(b.children)) {
        return b.children.map((c: any) => c.text || '').join('');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function extractYoutubeVideoId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export async function runSeed() {
  console.log('--- Starting Vibelearn Database Seeding ---');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const courseRepo = AppDataSource.getRepository(Course);
  const moduleRepo = AppDataSource.getRepository(CourseModule);
  const lessonRepo = AppDataSource.getRepository(Lesson);

  const seedPath = path.resolve(__dirname, '../../../docs/seed.ndjson');
  const videosPath = path.resolve(__dirname, '../../../docs/videos.json');

  if (!fs.existsSync(seedPath) || !fs.existsSync(videosPath)) {
    throw new Error(`Seed files not found at ${seedPath} or ${videosPath}`);
  }

  // Load videos.json
  const rawVideos = fs.readFileSync(videosPath, 'utf8');
  const videosMap: Record<string, { id: string; title: string; duration: number }> =
    JSON.parse(rawVideos);

  // Parse seed.ndjson
  const categories: Record<string, any> = {};
  const instructors: Record<string, any> = {};
  const rawLessons: Record<string, any> = {};
  const rawCourses: any[] = [];

  const fileStream = fs.createReadStream(seedPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const doc = JSON.parse(line);
    if (doc._type === 'category') categories[doc._id] = doc;
    if (doc._type === 'instructor') instructors[doc._id] = doc;
    if (doc._type === 'lesson') rawLessons[doc._id] = doc;
    if (doc._type === 'course') rawCourses.push(doc);
  }

  console.log(
    `Parsed from seed.ndjson: ${Object.keys(categories).length} categories, ${Object.keys(instructors).length} instructors, ${rawCourses.length} courses, ${Object.keys(rawLessons).length} lessons.`,
  );

  let coursesCount = 0;
  let modulesCount = 0;
  let lessonsCount = 0;

  for (const rawCourse of rawCourses) {
    const slug = rawCourse.slug?.current || rawCourse.slug;
    const instructorRef = rawCourse.instructor?._ref;
    const instructor = instructorRef ? instructors[instructorRef] : null;

    const categoryRef = rawCourse.category?._ref;
    const category = categoryRef ? categories[categoryRef]?.title : 'Web Development';

    let coverImageUrl = rawCourse.coverImage?._sanityAsset || null;
    if (coverImageUrl && coverImageUrl.startsWith('image@')) {
      coverImageUrl = coverImageUrl.replace('image@', '');
    }

    let instructorAvatar = instructor?.avatar?._sanityAsset || null;
    if (instructorAvatar && instructorAvatar.startsWith('image@')) {
      instructorAvatar = instructorAvatar.replace('image@', '');
    }

    // Upsert Course
    let course = await courseRepo.findOne({ where: { slug } });
    if (!course) {
      course = courseRepo.create({
        slug,
        title: rawCourse.title,
        summary: rawCourse.summary || null,
        coverImageUrl,
        category,
        instructorName: instructor?.name || 'Lead Instructor',
        instructorBio: instructor?.bio || null,
        instructorAvatar,
        level: rawCourse.level || 'Intermediate',
        price: Number(rawCourse.price) || 0,
        popular: Boolean(rawCourse.popular),
        studentCount: Number(rawCourse.studentCount) || 0,
        learningOutcomes: rawCourse.learningOutcomes || [],
      });
      course = await courseRepo.save(course);
    } else {
      course.title = rawCourse.title;
      course.summary = rawCourse.summary || null;
      course.coverImageUrl = coverImageUrl;
      course.category = category;
      course.instructorName = instructor?.name || course.instructorName;
      course.instructorBio = instructor?.bio || course.instructorBio;
      course.instructorAvatar = instructorAvatar || course.instructorAvatar;
      course.level = rawCourse.level || course.level;
      course.price = Number(rawCourse.price) || 0;
      course.popular = Boolean(rawCourse.popular);
      course.studentCount = Number(rawCourse.studentCount) || course.studentCount;
      course.learningOutcomes = rawCourse.learningOutcomes || course.learningOutcomes;
      course = await courseRepo.save(course);
    }
    coursesCount++;

    // Process Modules
    if (Array.isArray(rawCourse.modules)) {
      for (let mIdx = 0; mIdx < rawCourse.modules.length; mIdx++) {
        const rawMod = rawCourse.modules[mIdx];
        const modPosition = mIdx + 1;

        let courseMod = await moduleRepo.findOne({
          where: { courseId: course.id, title: rawMod.title },
        });

        if (!courseMod) {
          courseMod = moduleRepo.create({
            courseId: course.id,
            title: rawMod.title,
            summary: rawMod.summary || null,
            position: modPosition,
          });
          courseMod = await moduleRepo.save(courseMod);
        } else {
          courseMod.summary = rawMod.summary || courseMod.summary;
          courseMod.position = modPosition;
          courseMod = await moduleRepo.save(courseMod);
        }
        modulesCount++;

        // Process Lessons in Module
        if (Array.isArray(rawMod.lessons)) {
          for (let lIdx = 0; lIdx < rawMod.lessons.length; lIdx++) {
            const lessonRef = rawMod.lessons[lIdx]?._ref;
            const rawLesson = lessonRef ? rawLessons[lessonRef] : null;
            if (!rawLesson) continue;

            const lessonSlug = rawLesson.slug?.current || rawLesson.slug;
            const videoMeta = videosMap[lessonSlug];

            const youtubeVideoId =
              videoMeta?.id || extractYoutubeVideoId(rawLesson.videoUrl) || 'dQw4w9WgXcQ';
            const duration = videoMeta?.duration || rawLesson.duration || 0;
            const plainNotes = extractPlainTextFromBlocks(rawLesson.notes);
            const lessonPosition = lIdx + 1;

            let lesson = await lessonRepo.findOne({
              where: { courseId: course.id, slug: lessonSlug },
            });

            if (!lesson) {
              lesson = lessonRepo.create({
                moduleId: courseMod.id,
                courseId: course.id,
                title: rawLesson.title,
                slug: lessonSlug,
                youtubeVideoId,
                videoUrl: rawLesson.videoUrl || `https://www.youtube.com/watch?v=${youtubeVideoId}`,
                duration,
                freePreview: Boolean(rawLesson.freePreview),
                notes: rawLesson.notes || [],
                notesPlain: plainNotes,
                keyPoints: rawLesson.keyPoints || [],
                proTip: rawLesson.proTip || null,
                resources: rawLesson.resources || [],
                position: lessonPosition,
              });
              await lessonRepo.save(lesson);
            } else {
              lesson.moduleId = courseMod.id;
              lesson.title = rawLesson.title;
              lesson.youtubeVideoId = youtubeVideoId;
              lesson.videoUrl = rawLesson.videoUrl || lesson.videoUrl;
              lesson.duration = duration;
              lesson.freePreview = Boolean(rawLesson.freePreview);
              lesson.notes = rawLesson.notes || lesson.notes;
              lesson.notesPlain = plainNotes;
              lesson.keyPoints = rawLesson.keyPoints || lesson.keyPoints;
              lesson.proTip = rawLesson.proTip || lesson.proTip;
              lesson.resources = rawLesson.resources || lesson.resources;
              lesson.position = lessonPosition;
              await lessonRepo.save(lesson);
            }
            lessonsCount++;
          }
        }
      }
    }
  }

  console.log(`\n--- Seeding Successfully Completed ---`);
  console.log(`- Courses seeded: ${coursesCount}`);
  console.log(`- Modules seeded: ${modulesCount}`);
  console.log(`- Lessons seeded: ${lessonsCount}`);

  await AppDataSource.destroy();
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('Seeding failed with error:', err);
    process.exit(1);
  });
}
