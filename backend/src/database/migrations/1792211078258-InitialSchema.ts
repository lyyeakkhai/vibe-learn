import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792211078258 implements MigrationInterface {
    name = 'InitialSchema1792211078258'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "lessons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "module_id" uuid NOT NULL, "course_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "youtube_video_id" character varying(100) NOT NULL, "video_url" character varying(1024), "duration" integer NOT NULL DEFAULT '0', "free_preview" boolean NOT NULL DEFAULT false, "notes" jsonb, "notes_plain" text, "key_points" jsonb, "pro_tip" text, "resources" jsonb, "position" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9b9a8d455cac672d262d7275730" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_lessons_module_position" ON "lessons"  ("module_id", "position") `);
        await queryRunner.query(`CREATE INDEX "idx_lessons_course_slug" ON "lessons"  ("course_id", "slug") `);
        await queryRunner.query(`CREATE TABLE "modules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "course_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "summary" text, "position" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7dbefd488bd96c5bf31f0ce0c95" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_modules_course_position" ON "modules"  ("course_id", "position") `);
        await queryRunner.query(`CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying(255) NOT NULL, "title" character varying(255) NOT NULL, "summary" text, "cover_image_url" character varying(1024), "category" character varying(100), "instructor_name" character varying(255), "instructor_bio" text, "instructor_avatar" character varying(1024), "level" character varying(50), "price" numeric(10,2) NOT NULL DEFAULT '0', "popular" boolean NOT NULL DEFAULT false, "student_count" integer NOT NULL DEFAULT '0', "learning_outcomes" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a3bb2d01cfa0f95bc5e034e1b7a" UNIQUE ("slug"), CONSTRAINT "PK_3f70a487cc718ad8eda4e6d58c9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a3bb2d01cfa0f95bc5e034e1b7" ON "courses"  ("slug") `);
        await queryRunner.query(`CREATE TABLE "progress" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying(255) NOT NULL, "course_id" uuid NOT NULL, "lesson_id" uuid NOT NULL, "is_completed" boolean NOT NULL DEFAULT false, "resume_timestamp" integer NOT NULL DEFAULT '0', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9e287419e37b04d545078d9c9b9" UNIQUE ("user_id", "lesson_id"), CONSTRAINT "PK_79abdfd87a688f9de756a162b6f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_progress_user_course" ON "progress"  ("user_id", "course_id") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" character varying(255) NOT NULL, "email" character varying(255), "full_name" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "lessons" ADD CONSTRAINT "FK_35fb2307535d90a6ed290af1f4a" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lessons" ADD CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "modules" ADD CONSTRAINT "FK_0a00005552998b16b7e89340843" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "progress" ADD CONSTRAINT "FK_ddcaca3a9db9d77105d51c02c24" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "progress" ADD CONSTRAINT "FK_9897da156d9334d48cfdba69b24" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "progress" ADD CONSTRAINT "FK_ef62be61a6c4f69d0570bb5cc35" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "progress" DROP CONSTRAINT "FK_ef62be61a6c4f69d0570bb5cc35"`);
        await queryRunner.query(`ALTER TABLE "progress" DROP CONSTRAINT "FK_9897da156d9334d48cfdba69b24"`);
        await queryRunner.query(`ALTER TABLE "progress" DROP CONSTRAINT "FK_ddcaca3a9db9d77105d51c02c24"`);
        await queryRunner.query(`ALTER TABLE "modules" DROP CONSTRAINT "FK_0a00005552998b16b7e89340843"`);
        await queryRunner.query(`ALTER TABLE "lessons" DROP CONSTRAINT "FK_3c4e299cf8ed04093935e2e22fe"`);
        await queryRunner.query(`ALTER TABLE "lessons" DROP CONSTRAINT "FK_35fb2307535d90a6ed290af1f4a"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."idx_progress_user_course"`);
        await queryRunner.query(`DROP TABLE "progress"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3bb2d01cfa0f95bc5e034e1b7"`);
        await queryRunner.query(`DROP TABLE "courses"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modules_course_position"`);
        await queryRunner.query(`DROP TABLE "modules"`);
        await queryRunner.query(`DROP INDEX "public"."idx_lessons_course_slug"`);
        await queryRunner.query(`DROP INDEX "public"."idx_lessons_module_position"`);
        await queryRunner.query(`DROP TABLE "lessons"`);
    }

}
