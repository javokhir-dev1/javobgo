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

@Module({
  imports: [
    SettingsModule, DmMessagesModule, LogsModule, RateLimitModule,
    AutomationsModule, AgentsModule, InboxModule, InstagramAccountsModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
