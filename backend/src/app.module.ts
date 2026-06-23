import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookModule } from './webhook/webhook.module';
import { SettingsModule } from './settings/settings.module';
import { DmMessagesModule } from './dm-messages/dm-messages.module';
import { LogsModule } from './logs/logs.module';
import { InstagramModule } from './instagram/instagram.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { CommentRulesModule } from './comment-rules/comment-rules.module';
import { AgentsModule } from './agents/agents.module';
import { AutomationsModule } from './automations/automations.module';
import { InboxModule } from './inbox/inbox.module';
import { AuthModule } from './auth/auth.module';
import { InstagramAccountsModule } from './instagram-accounts/instagram-accounts.module';
import { InstagramAccount } from './instagram-accounts/instagram-account.entity';
import { Agent } from './agents/entities/agent.entity';
import { ChatMessage } from './agents/entities/chat-message.entity';
import { Automation } from './automations/entities/automation.entity';
import { Settings } from './settings/entities/settings.entity';
import { DmMessage } from './dm-messages/entities/dm-message.entity';
import { DmCounter } from './dm-messages/entities/dm-counter.entity';
import { Log } from './logs/entities/log.entity';
import { RateLimit } from './rate-limit/entities/rate-limit.entity';
import { CommentRule } from './comment-rules/entities/comment-rule.entity';
import { Conversation } from './inbox/entities/conversation.entity';
import { InboxMessage } from './inbox/entities/inbox-message.entity';
import { TelegramUser } from './telegram/telegram-user.entity';
import { AuthToken } from './auth/auth-token.entity';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'password'),
        database: config.get('DB_DATABASE', 'instabot'),
        entities: [
          Settings, DmMessage, DmCounter, Log, RateLimit, CommentRule,
          Agent, ChatMessage, Automation, Conversation, InboxMessage,
          TelegramUser, AuthToken, User, InstagramAccount,
        ],
        synchronize: true,
        dropSchema: false,
      }),
    }),

    AuthModule,
    InstagramAccountsModule,
    InstagramModule,
    RateLimitModule,
    CommentRulesModule,
    AgentsModule,
    AutomationsModule,
    InboxModule,
    WebhookModule,
    SettingsModule,
    DmMessagesModule,
    LogsModule,
  ],
})
export class AppModule {}
