import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookProcessor } from '../queue/webhook.processor';
import { SettingsModule } from '../settings/settings.module';
import { DmMessagesModule } from '../dm-messages/dm-messages.module';
import { LogsModule } from '../logs/logs.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { AutomationsModule } from '../automations/automations.module';
import { AgentsModule } from '../agents/agents.module';
import { InboxModule } from '../inbox/inbox.module';
import { InstagramAccountsModule } from '../instagram-accounts/instagram-accounts.module';
import { AdminModule } from '../admin/admin.module';
import { WEBHOOK_QUEUE } from '../queue/queue.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: WEBHOOK_QUEUE }),
    SettingsModule, DmMessagesModule, LogsModule, RateLimitModule,
    AutomationsModule, AgentsModule, InboxModule, InstagramAccountsModule,
    AdminModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookProcessor],
  exports: [WebhookService],
})
export class WebhookModule {}
