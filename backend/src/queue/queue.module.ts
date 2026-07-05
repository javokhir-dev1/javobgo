import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const WEBHOOK_QUEUE = 'webhook-events';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: WEBHOOK_QUEUE,
      defaultJobOptions: {
        // Har bir job queue ga tushgandan 2 soniya o'tib boshlanadi
        // Bu qo'shimcha bufer — joblar to'planib ketsa ham biroz sochiladi
        delay: 2_000,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
