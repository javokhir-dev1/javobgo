import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportRequest } from './entities/support-request.entity';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { AccountController } from './account.controller';
import { SupportController } from './support.controller';
import { AccountDeletionService } from './account-deletion.service';
import { SupportService } from './support.service';
import { TelegramNotifyService } from './telegram-notify.service';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportRequest, TelegramUser]),
    AuthModule,
  ],
  controllers: [AccountController, SupportController],
  providers: [AccountDeletionService, SupportService, TelegramNotifyService, AdminGuard],
  exports: [AccountDeletionService, SupportService],
})
export class AccountModule {}
