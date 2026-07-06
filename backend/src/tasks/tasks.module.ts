import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { AuthToken } from '../auth/auth-token.entity';
import { InstagramAccount } from '../instagram-accounts/instagram-account.entity';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthToken, InstagramAccount]),
    AccountModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}
