import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { Course } from '../modules/courses/entities/course.entity';
import { CourseModule } from '../modules/course-modules/entities/course-module.entity';
import { Lesson } from '../modules/lessons/entities/lesson.entity';
import { Progress } from '../modules/progress/entities/progress.entity';
import { Todo } from '../modules/todos/entities/todo.entity';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const isSslRequired =
  process.env.DB_SSL === 'true' ||
  (databaseUrl ? databaseUrl.includes('supabase.com') : false);

const baseOptions = {
  entities: [User, Course, CourseModule, Lesson, Progress, Todo],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  ssl: isSslRequired ? { rejectUnauthorized: false } : false,
};

const options: DataSourceOptions = databaseUrl
  ? {
      type: 'postgres',
      url: databaseUrl,
      ...baseOptions,
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      username: process.env.DB_USERNAME || 'vibelearn',
      password: process.env.DB_PASSWORD || 'vibelearn_password',
      database: process.env.DB_NAME || 'vibelearn_db',
      ...baseOptions,
    };

const AppDataSource = new DataSource(options);

export default AppDataSource;
