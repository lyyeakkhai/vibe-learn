import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const dbSsl = config.get<boolean | string>('DB_SSL');
        const isSsl =
          dbSsl === true ||
          dbSsl === 'true' ||
          (databaseUrl ? databaseUrl.includes('supabase.com') : false);

        const baseOptions = {
          autoLoadEntities: true,
          synchronize:
            config.get<string>('NODE_ENV') !== 'production' && !databaseUrl,
          logging: config.get<boolean>('DB_LOGGING', false),
          ssl: isSsl ? { rejectUnauthorized: false } : false,
        };

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ...baseOptions,
          };
        }

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5433),
          username: config.get<string>('DB_USERNAME', 'vibelearn'),
          password: config.get<string>('DB_PASSWORD', 'vibelearn_password'),
          database: config.get<string>('DB_NAME', 'vibelearn_db'),
          ...baseOptions,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
