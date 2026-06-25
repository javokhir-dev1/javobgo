import { Injectable, Logger } from '@nestjs/common';
import { InstagramService, IgCredentials } from '../instagram/instagram.service';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';
import { SettingsService } from '../settings/settings.service';
import { DmMessagesService } from '../dm-messages/dm-messages.service';
import { LogsService } from '../logs/logs.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { AutomationsService } from '../automations/automations.service';
import { AgentsService } from '../agents/agents.service';
import { InboxService } from '../inbox/inbox.service';
import { AdminService } from '../admin/admin.service';

const MIN_DELAY_MS = 5_000;
const MAX_DELAY_MS = 10_000;

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private instagram: InstagramService,
    private igAccounts: InstagramAccountsService,
    private settings: SettingsService,
    private dmMessages: DmMessagesService,
    private logs: LogsService,
    private rateLimit: RateLimitService,
    private automations: AutomationsService,
    private agents: AgentsService,
    private inboxService: InboxService,
    private adminService: AdminService,
  ) {}

  private pickRandom(templates: string[]): string | null {
    const valid = templates.filter(t => t?.trim());
    if (!valid.length) return null;
    return valid[Math.floor(Math.random() * valid.length)];
  }

  private async generateAiReply(
    agentId: number,
    telegram_id: string,
    commenterName: string,
    commentText: string,
    retries = 3
  ): Promise<string | null> {
    const prompt = `Foydalanuvchi nomi: ${commenterName}\nIzoh: ${commentText}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const reply = await this.agents.chat(agentId, telegram_id, [{ role: 'user', text: prompt }]);
        return reply?.trim() || null;
      } catch (err) {
        if (attempt === retries) {
          this.logger.error(`AI javob xatosi (agentId=${agentId}): ${err.message}`);
          return null;
        }
        this.logger.warn(`AI xatosi (agentId=${agentId}), urinish ${attempt}/${retries}. ${attempt * 2}s kutilmoqda... xato: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
    return null;
  }

  async handleEntry(entry: any) {
    const igAccountId: string = entry.id;
    this.logger.log(`📨 Webhook entry: ${igAccountId} | messaging:${entry.messaging?.length ?? 0} changes:${entry.changes?.length ?? 0}`);

    const account = await this.igAccounts.findByInstagramAccountId(igAccountId);
    if (!account) {
      this.logger.warn(`Webhook: ${igAccountId} uchun foydalanuvchi topilmadi`);
      return;
    }

    const telegram_id = account.telegram_id;
    const creds: IgCredentials = {
      token: account.access_token,
      accountId: account.instagram_account_id,
    };

    if (entry.messaging?.length) {
      for (const event of entry.messaging) {
        await this.handleIncomingDM(creds, account.instagram_account_id, telegram_id, event);
      }
    }
    if (entry.changes?.length) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          await this.handleComment(creds, account.instagram_account_id, telegram_id, change.value);
        }
      }
    }
  }

  private async handleIncomingDM(
    creds: IgCredentials,
    botAccountId: string,
    telegram_id: string,
    event: any,
  ) {
    const senderId = event.sender?.id;
    const isEcho = !!event.message?.is_echo;
    this.logger.log(`📩 DM event: sender=${senderId} echo=${isEcho} text=${!!event.message?.text}`);
    this.logger.log(`📦 DM raw: ${JSON.stringify(event, null, 2)}`);

    if (!event.message?.text) return;
    if (!senderId) return;

    // Inbox ga saqlaymiz (kiruvchi ham, echo ham)
    try {
      await this.inboxService.handleIncomingDM(creds, event);
      this.logger.log(`✅ Inbox saqlandi: sender=${senderId} echo=${isEcho}`);
    } catch (err) {
      this.logger.warn(`Inbox saqlash xatosi: ${err.message}`);
    }

    // Echo yoki bot o'z xabarlariga autoreply qilmasin
    if (isEcho || senderId === botAccountId) return;

    const s = await this.settings.get();
    if (!s.dmAutoReplyEnabled) return;

    // Soatlik javoblar limitini tekshirish
    const canReply = await this.adminService.checkBotReplyLimit(botAccountId);
    if (!canReply) {
      this.logger.warn(`Soatlik javob limiti tugadi (DM): botAccountId=${botAccountId}`);
      return;
    }

    const adminCfg = await this.adminService.getConfig();
    const dmLimit = adminCfg.dmLimit ?? 10;

    // Limit check: agar foydalanuvchi dmLimit tadan ko'p xabar yuborgan bo'lsa, javob bermaymiz
    const incomingCount = await this.inboxService.getIncomingMessageCount(botAccountId, senderId);
    if (incomingCount > dmLimit) {
      this.logger.log(`Limit: ${senderId} ${dmLimit} tadan ko'p xabar yubordi (${incomingCount}), javob berish to'xtatildi.`);
      return;
    }

    await this.rateLimit.randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);

    const userMessage = event.message.text;

    try {
      let reply: string | null = null;

      if (s.dmMode === 'ai' && s.dmAgentId) {
        const convs = await this.inboxService.getConversations(botAccountId);
        const conv  = convs.find(c => c.participantIgsid === senderId);
        const senderName = conv?.participantUsername || senderId;
        reply = await this.generateAiReply(s.dmAgentId, telegram_id, senderName, userMessage);
      } else {
        reply = await this.dmMessages.getNextMessage(telegram_id, botAccountId);
      }

      if (!reply) return;

      // Autoreply yuboramiz va inboxga 'out' sifatida saqlaymiz
      await this.inboxService.sendMessage(creds, senderId, reply);
      await this.logs.create({
        telegram_id, instagram_account_id: botAccountId,
        type: 'success', action: 'DM Avtoreply',
        message: reply.substring(0, 100), user: senderId,
        userMessage: userMessage.substring(0, 200),
      });
    } catch (err) {
      await this.logs.create({
        telegram_id, instagram_account_id: botAccountId,
        type: 'error', action: 'DM Avtoreply',
        message: err.message, user: senderId,
        userMessage: userMessage.substring(0, 200),
      });
    }
  }

  private async handleComment(
    creds: IgCredentials,
    botAccountId: string,
    telegram_id: string,
    commentData: any,
  ) {
    const commentId: string     = commentData.id;
    const commentText: string   = commentData.text ?? '';
    const commenterId: string   = commentData.from?.id;
    const commenterName: string = commentData.from?.username || 'foydalanuvchi';
    const mediaId: string       = commentData.media?.id;

    if (commenterId && commenterId === botAccountId) return;

    this.logger.log(`Yangi komment: @${commenterName}: "${commentText}"`);

    const activeAutomations = await this.automations.findActive(telegram_id, botAccountId);
    if (!activeAutomations.length) return;

    // Soatlik javoblar limitini tekshirish
    const canReply = await this.adminService.checkBotReplyLimit(botAccountId);
    if (!canReply) {
      this.logger.warn(`Soatlik javob limiti tugadi (Komment): botAccountId=${botAccountId}`);
      return;
    }

    const adminCfg = await this.adminService.getConfig();
    const commentLimit = adminCfg.commentLimit ?? 10;

    for (const auto of activeAutomations) {
      if (auto.postScope === 'specific') {
        if (!mediaId || !auto.postIds.includes(mediaId)) continue;
      }

      // Kalit so'z tekshiruvi
      let keywordMatched = true;
      if (auto.triggerType === 'keyword') {
        const validKw = (auto.keywords || []).filter(k => k?.trim());
        if (validKw.length > 0) {
          const lower = commentText.toLowerCase();
          keywordMatched = validKw.some(kw => lower.includes(kw.toLowerCase()));
        }
      }

      // Kalit so'z mos kelmadi VA agent ham yo'q → o'tkazib yubor
      if (!keywordMatched && !auto.replyAgentId && !auto.dmAgentId) continue;

      if (mediaId && commenterId) {
        const limitCheck = await this.rateLimit.canReply(commenterId, 'comment', 24, commentLimit, mediaId);
        if (!limitCheck.allowed) {
          this.logger.log(`Limit: @${commenterName} media (${mediaId}) uchun ${commentLimit} ta koment yozdi. Javob to'xtatildi.`);
          continue;
        }
      }

      await this.rateLimit.delay(
        Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS
      );

      let repliedOrDmed = false;

      // Izohga javob
      if (auto.replyEnabled) {
        let reply: string | null = null;
        let usedAgent = false;

        // AI ishlatish: 'any' trigger + agent, YOKI keyword mos kelmadi + agent
        const useReplyAi = !!auto.replyAgentId && (auto.triggerType === 'any' || !keywordMatched);
        if (useReplyAi) {
          reply = await this.generateAiReply(auto.replyAgentId!, telegram_id, commenterName, commentText);
          usedAgent = true;
        } else if (keywordMatched) {
          // Kalit so'z mos keldi → shablon
          const tmpl = this.pickRandom(auto.replyTemplates || []);
          if (tmpl) reply = tmpl.replace('{name}', commenterName).replace('{comment}', commentText);
        }

        if (reply) {
          try {
            await this.instagram.replyToComment(creds, commentId, reply);
            repliedOrDmed = true;
            await this.logs.create({
              telegram_id, instagram_account_id: botAccountId,
              type: 'success',
              action: usedAgent ? 'AI Komment Javob' : 'Komment Javob',
              message: reply.substring(0, 100), user: commenterName,
              userMessage: commentText?.substring(0, 200),
            });
          } catch (err) {
            await this.logs.create({
              telegram_id, instagram_account_id: botAccountId,
              type: 'error', action: 'Komment Javob',
              message: err.message, user: commenterName,
              userMessage: commentText?.substring(0, 200),
            });
          }
        }
      }

      // DM yuborish
      if (auto.dmEnabled && commenterId) {
        let dm: string | null = null;
        let usedAgent = false;

        // AI ishlatish: 'any' trigger + agent, YOKI keyword mos kelmadi + agent
        const useDmAi = !!auto.dmAgentId && (auto.triggerType === 'any' || !keywordMatched);
        if (useDmAi) {
          dm = await this.generateAiReply(auto.dmAgentId!, telegram_id, commenterName, commentText);
          usedAgent = true;
        } else if (keywordMatched) {
          // Kalit so'z mos keldi → shablon
          const tmpl = this.pickRandom(auto.dmTemplates || []);
          if (tmpl) dm = tmpl.replace('{name}', commenterName).replace('{comment}', commentText);
        }

        if (dm) {
          try {
            await this.instagram.sendDM(creds, commenterId, dm);
            repliedOrDmed = true;
            await this.logs.create({
              telegram_id, instagram_account_id: botAccountId,
              type: 'success',
              action: usedAgent ? 'AI Kommentdan DM' : 'Kommentdan DM',
              message: dm.substring(0, 100), user: commenterName,
              userMessage: commentText?.substring(0, 200),
            });
          } catch (err) {
            await this.logs.create({
              telegram_id, instagram_account_id: botAccountId,
              type: 'error', action: 'Kommentdan DM',
              message: err.message, user: commenterName,
            });
          }
        }
      }

      if (repliedOrDmed && mediaId && commenterId) {
        await this.rateLimit.recordReply(commenterId, 'comment', 24, mediaId);
      }
    }
  }
}
