import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { RequestLog } from './entities/request-log.entity';
import { ApiQuotaConfig } from './entities/api-quota-config.entity';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { InstagramAccount } from '../instagram-accounts/instagram-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestLog, ApiQuotaConfig, TelegramUser, InstagramAccount]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
  exports: [AdminService],
})
export class AdminModule {}
