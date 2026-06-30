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

type DmItem = { text: string; buttonText?: string; buttonUrl?: string };

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

  private pickRandomDmItem(templates: any[]): DmItem | null {
    const valid = templates.filter(t => (typeof t === 'string' ? t : t?.text)?.trim());
    if (!valid.length) return null;
    const item = valid[Math.floor(Math.random() * valid.length)];
    if (typeof item === 'string') return { text: item };
    return {
      text: item.text,
      buttonText: item.buttonText || undefined,
      buttonUrl: item.buttonUrl || undefined,
    };
  }

  private async generateAiReply(
    agentId: number,
    instagram_account_id: string,
    commenterName: string,
    commentText: string,
    retries = 3,
  ): Promise<string | null> {
    const prompt = 'Foydalanuvchi nomi: ' + commenterName + '\nIzoh: ' + commentText;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const reply = await this.agents.chat(agentId, instagram_account_id, [{ role: 'user', text: prompt }]);
        return reply?.trim() || null;
      } catch (err) {
        if (attempt === retries) {
          this.logger.error('AI javob xatosi (agentId=' + agentId + '): ' + err.message);
          return null;
        }
        this.logger.warn('AI xatosi, urinish ' + attempt + '/' + retries + ': ' + err.message);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
    return null;
  }

  async handleEntry(entry: any) {
    const igAccountId: string = entry.id;
    this.logger.log('Webhook entry: ' + igAccountId);

    const account = await this.igAccounts.findByInstagramAccountId(igAccountId);
    if (!account) {
      this.logger.warn('Webhook: ' + igAccountId + ' uchun foydalanuvchi topilmadi');
      return;
    }

    const telegram_id = account.telegram_id;
    const creds: IgCredentials = {
      token: account.access_token,
      accountId: account.instagram_account_id,
    };

    // DM: eski Messenger formatida (entry.messaging[])
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
        // DM: yangi changes formatida (entry.changes[].field === 'messages')
        if (change.field === 'messages' && change.value) {
          const v = change.value;
          const event = {
            sender:    { id: v.sender?.id ?? v.from?.id },
            recipient: { id: v.recipient?.id },
            message:   { text: v.message?.text ?? v.text, is_echo: v.message?.is_echo },
          };
          await this.handleIncomingDM(creds, account.instagram_account_id, telegram_id, event);
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

    if (!event.message?.text) return;
    if (!senderId) return;

    try {
      await this.inboxService.handleIncomingDM(creds, event);
    } catch (err) {
      this.logger.warn('Inbox saqlash xatosi: ' + err.message);
    }

    if (isEcho || senderId === botAccountId) return;

    const s = await this.settings.get(botAccountId);
    if (!s.dmAutoReplyEnabled) return;

    const canReply = await this.adminService.checkBotReplyLimit(botAccountId);
    if (!canReply) {
      this.logger.warn('Soatlik limit tugadi (DM): ' + botAccountId);
      return;
    }

    const adminCfg = await this.adminService.getConfig();
    const dmLimit = adminCfg.dmLimit ?? 10;
    const incomingCount = await this.inboxService.getIncomingMessageCount(botAccountId, senderId);
    if (incomingCount > dmLimit) {
      this.logger.log('DM limit: ' + senderId + ' ' + incomingCount + ' xabar yubordi');
      return;
    }

    await this.rateLimit.randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);

    const userMessage = event.message.text;

    try {
      if (s.dmMode === 'ai' && s.dmAgentId) {
        const convs = await this.inboxService.getConversations(botAccountId);
        const conv  = convs.find(c => c.participantIgsid === senderId);
        const senderName = conv?.participantUsername || senderId;
        const reply = await this.generateAiReply(s.dmAgentId, botAccountId, senderName, userMessage);
        if (!reply) return;
        await this.inboxService.sendMessage(creds, senderId, reply);
        await this.logs.create({
          telegram_id, instagram_account_id: botAccountId,
          type: 'success', action: 'DM Avtoreply (AI)',
          message: reply.substring(0, 100), user: senderId,
          userMessage: userMessage.substring(0, 200),
        });
      } else {
        const msgData = await this.dmMessages.getNextMessageData(telegram_id, botAccountId);
        if (!msgData) return;
        if (msgData.buttonText && msgData.buttonUrl) {
          await this.instagram.sendDMWithButton(creds, senderId, msgData.text, msgData.buttonText, msgData.buttonUrl);
        } else {
          await this.inboxService.sendMessage(creds, senderId, msgData.text);
        }
        await this.logs.create({
          telegram_id, instagram_account_id: botAccountId,
          type: 'success', action: 'DM Avtoreply',
          message: msgData.text.substring(0, 100), user: senderId,
          userMessage: userMessage.substring(0, 200),
        });
      }
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

    this.logger.log('Yangi komment: @' + commenterName + ': "' + commentText + '"');

    const activeAutomations = await this.automations.findActive(telegram_id, botAccountId);
    if (!activeAutomations.length) return;

    const canReply = await this.adminService.checkBotReplyLimit(botAccountId);
    if (!canReply) {
      this.logger.warn('Soatlik limit tugadi (Komment): ' + botAccountId);
      return;
    }

    const adminCfg = await this.adminService.getConfig();
    const commentLimit = adminCfg.commentLimit ?? 10;

    for (const auto of activeAutomations) {
      if (auto.postScope === 'specific') {
        if (!mediaId || !auto.postIds.includes(mediaId)) continue;
      }

      let keywordMatched = true;
      if (auto.triggerType === 'keyword') {
        const validKw = (auto.keywords || []).filter(k => k?.trim());
        if (validKw.length > 0) {
          const lower = commentText.toLowerCase();
          keywordMatched = validKw.some(kw => lower.includes(kw.toLowerCase()));
        }
      }

      if (!keywordMatched && !auto.replyAgentId && !auto.dmAgentId) continue;

      if (mediaId && commenterId) {
        const limitCheck = await this.rateLimit.canReply(commenterId, 'comment', 24, commentLimit, mediaId);
        if (!limitCheck.allowed) {
          this.logger.log('Komment limit: @' + commenterName);
          continue;
        }
      }

      await this.rateLimit.delay(
        Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS
      );

      let repliedOrDmed = false;

      if (auto.replyEnabled) {
        let reply: string | null = null;
        let usedAgent = false;

        const useReplyAi = !!auto.replyAgentId && (auto.triggerType === 'any' || !keywordMatched);
        if (useReplyAi) {
          reply = await this.generateAiReply(auto.replyAgentId!, botAccountId, commenterName, commentText);
          usedAgent = true;
          if (!reply) {
            const tmpl = this.pickRandom(auto.replyTemplates || []);
            if (tmpl) { reply = tmpl.replace('{name}', commenterName).replace('{comment}', commentText); usedAgent = false; }
          }
        } else if (keywordMatched) {
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
            });
          }
        }
      }

      if (auto.dmEnabled && commenterId) {
        let dmText: string | null = null;
        let usedAgent = false;

        const useDmAi = !!auto.dmAgentId && (auto.triggerType === 'any' || !keywordMatched);
        if (useDmAi) {
          const aiText = await this.generateAiReply(auto.dmAgentId!, botAccountId, commenterName, commentText);
          usedAgent = !!aiText;
          if (aiText) {
            dmText = aiText;
          } else {
            const tmpl = this.pickRandomDmItem(auto.dmTemplates || []);
            if (tmpl) dmText = tmpl.text.replace('{name}', commenterName).replace('{comment}', commentText);
          }
        } else if (keywordMatched) {
          const tmpl = this.pickRandomDmItem(auto.dmTemplates || []);
          if (tmpl) dmText = tmpl.text.replace('{name}', commenterName).replace('{comment}', commentText);
        }

        if (dmText) {
          try {
            await this.instagram.sendDM(creds, commenterId, dmText);
            // Global DM tugmalar (barcha javoblar tagida)
            const dmButtons = (auto as any).dmButtons as { title: string; url: string }[] | undefined;
            if (dmButtons?.length) {
              await this.instagram.sendDMButtons(creds, commenterId, dmButtons);
            }
            repliedOrDmed = true;
            await this.logs.create({
              telegram_id, instagram_account_id: botAccountId,
              type: 'success',
              action: usedAgent ? 'AI Kommentdan DM' : 'Kommentdan DM',
              message: dmText.substring(0, 100), user: commenterName,
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

      if (repliedOrDmed && commenterId) {
        await this.rateLimit.recordReply(commenterId, 'comment', 24, mediaId);
      }
    }
  }
}
