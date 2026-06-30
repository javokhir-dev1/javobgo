import { Controller, Get, Post, Query, Body, Req, Res, HttpCode, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { WEBHOOK_QUEUE } from '../queue/queue.module';

@Controller('api/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get('WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook tasdiqlandi');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  @Post()
  @HttpCode(200)
  receive(@Req() req: Request & { rawBody?: Buffer }, @Body() body: any, @Res() res: Response) {
    const appSecret = this.config.get<string>('INSTAGRAM_APP_SECRET');
    if (appSecret) {
      const sigHeader = req.headers['x-hub-signature-256'] as string | undefined;
      if (!sigHeader) {
        this.logger.warn("Webhook: x-hub-signature-256 header yo'q");
        return res.sendStatus(403);
      }
      if (!req.rawBody) {
        this.logger.warn("Webhook: rawBody mavjud emas, so'rov rad etildi");
        return res.sendStatus(403);
      }
      const rawBody: Buffer = req.rawBody;
      const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      const sigBuf      = Buffer.from(sigHeader);
      const expectedBuf = Buffer.from(expected);
      if (
        sigBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(sigBuf, expectedBuf)
      ) {
        this.logger.warn('Webhook: imzo mos kelmadi');
        return res.sendStatus(403);
      }
    }

    res.sendStatus(200);

    const entries = Array.isArray(body.entry) ? body.entry : [body];
    for (const entry of entries) {
      this.queue.add('handle-entry', { entry }, {
        attempts: 5,
        backoff: { type: 'fixed', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      }).catch((err) => {
        this.logger.error(`Queue ga qo'shishda xato: ${err.message}`);
      });
    }
  }
}
