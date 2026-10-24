import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTodosTable1792212000000 implements MigrationInterface {
  name = 'DropTodosTable1792212000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "todos" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op rollback
  }
}
