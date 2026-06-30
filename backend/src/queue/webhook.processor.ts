import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, DelayedError } from 'bullmq';
import { WebhookService } from '../webhook/webhook.service';
import { AdminService } from '../admin/admin.service';
import { WEBHOOK_QUEUE } from './queue.module';

@Processor(WEBHOOK_QUEUE, { concurrency: 3 })
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly adminService: AdminService,
  ) {
    super();
  }

  async process(job: Job<{ entry: any }>, token?: string) {
    const { entry } = job.data;
    if (!entry?.id) {
      this.logger.warn('Job da igAccountId topilmadi, o`tkazib yuborildi');
      return;
    }

    const igAccountId: string = entry.id;
    const limitResult = await this.adminService.checkBotReplyLimitWithDelay(igAccountId);

    if (!limitResult.allowed) {
      const delayMs = limitResult.delayMs ?? 60_000;
      this.logger.warn(
        `Rate limit: ${igAccountId} — ${Math.round(delayMs / 1000)}s dan keyin qayta uriniladi`,
      );
      await job.moveToDelayed(Date.now() + delayMs, token);
      throw new DelayedError();
    }

    await this.webhookService.handleEntry(entry);
  }
}
