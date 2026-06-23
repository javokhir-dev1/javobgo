import { Controller, Get, Post, Query, Body, Res, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService,
  ) {}

  // Meta webhook verification
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get('WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook tasdiqlandi');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  // Instagram events
  @Post()
  @HttpCode(200)
  async receive(@Body() body: any) {
    if (body.object !== 'instagram') return { status: 'ignored' };

    for (const entry of body.entry ?? []) {
      await this.webhookService.handleEntry(entry);
    }

    return { status: 'ok' };
  }
}
