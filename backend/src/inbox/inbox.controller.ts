import {
  Controller, Get, Post, Param, Body, Req, Sse, Header,
  MessageEvent, HttpCode, UnauthorizedException, NotFoundException,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';
import { InboxService } from './inbox.service';
import { AuthService } from '../auth/auth.service';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';
import { IgCredentials } from '../instagram/instagram.service';

@Controller('api/inbox')
export class InboxController {
  constructor(
    private readonly inbox: InboxService,
    private readonly auth: AuthService,
    private readonly igAccounts: InstagramAccountsService,
  ) {}

  private getTelegramId(req: Request): string {
    const token = req.cookies?.['tg_access_token'];
    if (!token) throw new UnauthorizedException('Cookie topilmadi');
    const payload = this.auth.verifyJwt(token);
    if (!payload?.telegram_id) throw new UnauthorizedException('Token noto\'g\'ri');
    return String(payload.telegram_id);
  }

  private async getCreds(req: Request): Promise<{ creds: IgCredentials; ig_account_id: string }> {
    const telegram_id = this.getTelegramId(req);
    const account = await this.igAccounts.findByTelegramId(telegram_id);
    if (!account?.access_token || !account?.instagram_account_id) {
      throw new NotFoundException('Instagram hisobi ulanmagan');
    }
    return {
      creds: { token: account.access_token, accountId: account.instagram_account_id },
      ig_account_id: account.instagram_account_id,
    };
  }

  /** SSE — faqat shu akkauntning xabarlari keladi */
  @Sse('events')
  @Header('X-Accel-Buffering', 'no')
  async events(@Req() req: Request): Promise<Observable<MessageEvent>> {
    const { ig_account_id } = await this.getCreds(req);
    return this.inbox.subscribe(ig_account_id).pipe(
      map(({ type, data }) => ({
        type,
        data: JSON.stringify(data),
      })),
    );
  }

  @Get('conversations')
  async getConversations(@Req() req: Request) {
    const { ig_account_id } = await this.getCreds(req);
    return this.inbox.getConversations(ig_account_id);
  }

  @Get('conversations/:id/messages')
  async getMessages(@Param('id') id: string) {
    return this.inbox.getMessages(Number(id));
  }

  @Post('conversations/:igsid/send')
  @HttpCode(200)
  async sendMessage(
    @Req() req: Request,
    @Param('igsid') igsid: string,
    @Body() body: { text: string },
  ) {
    const { creds } = await this.getCreds(req);
    return this.inbox.sendMessage(creds, igsid, body.text);
  }

  @Post('sync')
  @HttpCode(200)
  async sync(@Req() req: Request) {
    const { creds } = await this.getCreds(req);
    return this.inbox.syncFromInstagram(creds);
  }

  @Get('user/:igsid')
  async getUserInfo(@Req() req: Request, @Param('igsid') igsid: string) {
    const { creds } = await this.getCreds(req);
    return this.inbox.getUserInfo(creds, igsid);
  }

  @Post('reset')
  @HttpCode(200)
  async reset() {
    return this.inbox.resetInbox();
  }
}
