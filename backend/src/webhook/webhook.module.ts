import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { SettingsModule } from '../settings/settings.module';
import { DmMessagesModule } from '../dm-messages/dm-messages.module';
import { LogsModule } from '../logs/logs.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { AutomationsModule } from '../automations/automations.module';
import { AgentsModule } from '../agents/agents.module';
import { InboxModule } from '../inbox/inbox.module';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';
import { AdminModule } from '../admin/admin.module';
import { QueueModule } from '../queue/queue.module';
import { WebhookProcessor } from '../queue/webhook.processor';

@Module({
  imports: [
    SettingsModule, DmMessagesModule, LogsModule, RateLimitModule,
    AutomationsModule, AgentsModule, InboxModule, InstagramAccountsModule,
    AdminModule, QueueModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookProcessor],
  exports: [WebhookService],
})
export class WebhookModule {}
