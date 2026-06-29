import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebhookProcessor } from './webhook.processor';
import { WebhookModule } from '../webhook/webhook.module';

export const WEBHOOK_QUEUE = 'webhook-events';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', undefined),
        },
      }),
    }),
    BullModule.registerQueue({ name: WEBHOOK_QUEUE }),
    WebhookModule,
  ],
  providers: [WebhookProcessor],
  exports: [BullModule],
})
export class QueueModule {}
