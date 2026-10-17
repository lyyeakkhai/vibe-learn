import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5433),
        username: config.get<string>('DB_USERNAME', 'vibelearn'),
        password: config.get<string>('DB_PASSWORD', 'vibelearn_password'),
        database: config.get<string>('DB_NAME', 'vibelearn_db'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<boolean>('DB_LOGGING', false),
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
