import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthAndTodos1792211078260 implements MigrationInterface {
  name = 'AddAuthAndTodos1792211078260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Alter users table
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hashed_refresh_token" character varying(255)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")`,
    );

    // 2. Create todos table
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "todos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" character varying(255) NOT NULL,
        "is_completed" boolean NOT NULL DEFAULT false,
        "owner_id" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "fk_todos_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_todos_owner_id" ON "todos" ("owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "todos"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "hashed_refresh_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash"`,
    );
  }
}
