import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRole1792211078259 implements MigrationInterface {
  name = 'AddUserRole1792211078259';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" character varying(20) NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "chk_users_role" CHECK ("role" IN ('user', 'admin'))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_role"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
  }
}
