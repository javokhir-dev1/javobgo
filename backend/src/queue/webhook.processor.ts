import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WebhookService } from '../webhook/webhook.service';
import { WEBHOOK_QUEUE } from './queue.module';

@Processor(WEBHOOK_QUEUE, { concurrency: 3 })
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly webhookService: WebhookService,
  ) {
    super();
  }

  async process(job: Job<{ entry: any }>) {
    const { entry } = job.data;
    if (!entry?.id) {
      this.logger.warn('Job da igAccountId topilmadi, o`tkazib yuborildi');
      return;
    }
    await this.webhookService.handleEntry(entry);
  }
}
