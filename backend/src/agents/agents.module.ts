import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AuthModule } from '../auth/auth.module';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, ChatMessage]), AuthModule, InstagramAccountsModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
