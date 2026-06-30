import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from './entities/log.entity';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { AuthModule } from '../auth/auth.module';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Log]), AuthModule, InstagramAccountsModule],
  providers: [LogsService],
  controllers: [LogsController],
  exports: [LogsService],
})
export class LogsModule {}
