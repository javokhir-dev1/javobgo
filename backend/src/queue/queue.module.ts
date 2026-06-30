import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const WEBHOOK_QUEUE = 'webhook-events';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: WEBHOOK_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
