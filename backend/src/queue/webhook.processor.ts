import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { WebhookService } from '../webhook/webhook.service';
import { AdminService } from '../admin/admin.service';
import { WEBHOOK_QUEUE } from './queue.module';

@Processor(WEBHOOK_QUEUE, { concurrency: 3 })
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly adminService: AdminService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ entry: any; attempt?: number }>) {
    const { entry } = job.data;
    const igAccountId: string = entry?.id;

    if (!igAccountId) {
      this.logger.warn('Job da igAccountId topilmadi, o`tkazib yuborildi');
      return;
    }

    // Soatlik limit tekshiruvi
    const limitResult = await this.adminService.checkBotReplyLimitWithDelay(igAccountId);

    if (!limitResult.allowed) {
      const delayMs = limitResult.delayMs ?? 60_000;
      const delayMin = Math.ceil(delayMs / 60000);
      this.logger.warn(
        'Soatlik limit: ' + igAccountId + '. ' + delayMin + ' daqiqadan keyin qayta ishlanadi.'
      );
      // Limitga yetganda o'chirib yuborish o'rniga navbatga qaytaramiz
      await this.queue.add('process', job.data, {
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
      });
      return;
    }

    await this.webhookService.handleEntry(entry);
  }
}
