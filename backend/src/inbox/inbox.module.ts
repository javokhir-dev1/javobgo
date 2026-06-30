import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { Conversation } from './entities/conversation.entity';
import { InboxMessage } from './entities/inbox-message.entity';
import { InstagramModule } from '../instagram/instagram.module';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, InboxMessage]),
    InstagramModule,
    InstagramAccountsModule,
    AuthModule,
  ],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
