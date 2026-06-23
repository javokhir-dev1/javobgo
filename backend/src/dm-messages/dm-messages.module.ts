import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DmMessage } from './entities/dm-message.entity';
import { DmCounter } from './entities/dm-counter.entity';
import { DmMessagesService } from './dm-messages.service';
import { DmMessagesController } from './dm-messages.controller';
import { AuthModule } from '../auth/auth.module';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';

@Module({
  imports: [TypeOrmModule.forFeature([DmMessage, DmCounter]), AuthModule, InstagramAccountsModule],
  providers: [DmMessagesService],
  controllers: [DmMessagesController],
  exports: [DmMessagesService],
})
export class DmMessagesModule {}
