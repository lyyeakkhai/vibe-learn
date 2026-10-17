import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { Course } from '../modules/courses/entities/course.entity';
import { CourseModule } from '../modules/course-modules/entities/course-module.entity';
import { Lesson } from '../modules/lessons/entities/lesson.entity';
import { Progress } from '../modules/progress/entities/progress.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'vibelearn',
  password: process.env.DB_PASSWORD || 'vibelearn_password',
  database: process.env.DB_NAME || 'vibelearn_db',
  entities: [User, Course, CourseModule, Lesson, Progress],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});

export default AppDataSource;
