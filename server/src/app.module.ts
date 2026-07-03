import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-ioredis-yet';
import { appConfig, databaseConfig, redisConfig, jwtConfig } from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CurrencyModule } from './currency/currency.module';
import { ChatModule } from './chat/chat.module';
import { GameModule } from './game/game.module';
import { AdminModule } from './admin/admin.module';
import { MatrixModule } from './matrix/matrix.module';
import { NotificationModule } from './notification/notification.module';
import { PushModule } from './push/push.module';
import { AssetModule } from './asset/asset.module';
import { SignInModule } from './sign-in/sign-in.module';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
    }),

    // TypeORM + MySQL
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        autoLoadEntities: true,
        synchronize: config.get('app.nodeEnv') === 'development',
        logging: config.get('app.nodeEnv') === 'development',
      }),
    }),

    // Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          host: config.get('redis.host'),
          port: config.get('redis.port'),
          password: config.get('redis.password'),
          db: config.get('redis.db'),
        }),
        ttl: 60 * 1000, // default 60s
      }),
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Auth (JWT + Passport, global guard)
    AuthModule,

    // User module
    UserModule,

    // Currency module
    CurrencyModule,

    // Chat module (IM + contacts + groups)
    ChatModule,

    // Game module
    GameModule,

    // Admin module
    AdminModule,

    // Matrix promotion module
    MatrixModule,

    // Asset package module
    AssetModule,

    SignInModule,

    // Service notification module (单向服务通知)
    NotificationModule,

    PushModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
