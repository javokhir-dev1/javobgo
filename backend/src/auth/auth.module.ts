import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CookieAuthGuard } from './cookie-auth.guard';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { AuthToken } from './auth-token.entity';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([TelegramUser, AuthToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, CookieAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, CookieAuthGuard, JwtModule],
})
export class AuthModule {}
