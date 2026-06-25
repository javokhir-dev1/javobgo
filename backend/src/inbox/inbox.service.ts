import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable, finalize } from 'rxjs';
import { Conversation } from './entities/conversation.entity';
import { InboxMessage } from './entities/inbox-message.entity';
import { InstagramService, IgCredentials } from '../instagram/instagram.service';

export interface SseEvent {
  type: string;
  data: any;
}

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  /** Room-based SSE: ig_account_id → Set<Subject> */
  private readonly rooms = new Map<string, Set<Subject<SseEvent>>>();

  constructor(
    @InjectRepository(Conversation)
    private convRepo: Repository<Conversation>,
    @InjectRepository(InboxMessage)
    private msgRepo: Repository<InboxMessage>,
    private instagram: InstagramService,
  ) {}

  // ─── SSE ───────────────────────────────────────────────────────────────────

  subscribe(ig_account_id: string): Observable<SseEvent> {
    const subject = new Subject<SseEvent>();

    if (!this.rooms.has(ig_account_id)) {
      this.rooms.set(ig_account_id, new Set());
    }
    this.rooms.get(ig_account_id)!.add(subject);

    return subject.asObservable().pipe(
      finalize(() => {
        this.rooms.get(ig_account_id)?.delete(subject);
        if (this.rooms.get(ig_account_id)?.size === 0) {
          this.rooms.delete(ig_account_id);
        }
      }),
    );
  }

  private emit(ig_account_id: string, type: string, data: any): void {
    this.rooms.get(ig_account_id)?.forEach(sub => sub.next({ type, data }));
  }

  // ─── Conversations ─────────────────────────────────────────────────────────

  async getConversations(ig_account_id: string): Promise<Conversation[]> {
    return this.convRepo.find({
      where: { instagram_account_id: ig_account_id },
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
    });
  }

  async getMessages(conversationId: number): Promise<InboxMessage[]> {
    await this.convRepo.update({ id: conversationId }, { unreadCount: 0 });
    return this.msgRepo.find({
      where: { conversationId },
      order: { igCreatedAt: 'ASC', createdAt: 'ASC' },
    });
  }

  async getIncomingMessageCount(ig_account_id: string, participantIgsid: string): Promise<number> {
    const conv = await this.convRepo.findOne({
      where: { instagram_account_id: ig_account_id, participantIgsid },
    });
    if (!conv) return 0;
    return this.msgRepo.count({
      where: { conversationId: conv.id, direction: 'in' },
    });
  }

  // ─── Webhook dan kelgan DM ────────────────────────────────────────────────

  async handleIncomingDM(creds: IgCredentials, event: any): Promise<void> {
    const messageText: string = event.message?.text || '';
    const messageId: string   = event.message?.mid  || '';
    // Instagram timestamp ishlatilmaydi — server vaqti ishlatiladi
    const now = new Date();

    const ig_account_id       = creds.accountId;

    if (!messageText) return;

    const senderId    = event.sender?.id;
    const recipientId = event.recipient?.id;
    if (!senderId || !recipientId) return;

    // Direction aniqlash
    let direction: 'in' | 'out';
    let participantIgsid: string;

    if (senderId === ig_account_id) {
      direction        = 'out';
      participantIgsid = recipientId;
    } else if (recipientId === ig_account_id) {
      direction        = 'in';
      participantIgsid = senderId;
    } else {
      this.logger.warn(`DM mos kelmadi: sender=${senderId} recipient=${recipientId} account=${ig_account_id}`);
      return;
    }

    this.logger.log(`💬 DM ${direction}: participant=${participantIgsid} account=${ig_account_id}`);

    // Conversation upsert
    let conv = await this.convRepo.findOne({
      where: { instagram_account_id: ig_account_id, participantIgsid },
    });

    if (!conv) {
      let participantUsername = participantIgsid;
      let participantName: string | null = null;
      let participantProfilePic: string | null = null;
      try {
        const info = await this.instagram.getUserInfo(creds, participantIgsid);
        participantUsername = info.username || info.name || participantIgsid;
        participantName = info.name || null;
        participantProfilePic = info.profile_pic || null;
      } catch (e) {
        this.logger.warn(`getUserInfo xatosi (${participantIgsid}): ${e.message}`);
      }

      conv = this.convRepo.create({
        instagram_account_id: ig_account_id,
        participantIgsid,
        participantUsername,
        participantName,
        participantProfilePic,
        lastMessage:   messageText,
        lastMessageAt: now,
        unreadCount:   direction === 'in' ? 1 : 0,
      });
    } else {
      conv.lastMessage   = messageText;
      conv.lastMessageAt = now;
      if (direction === 'in') conv.unreadCount = (conv.unreadCount || 0) + 1;
    }

    conv = await this.convRepo.save(conv);

    // Message insert — igMessageId UNIQUE dublikatdan saqlaydi
    if (messageId) {
      const exists = await this.msgRepo.findOne({ where: { igMessageId: messageId } });
      if (exists) return;
    }

    // Webapp orqali yuborilgan xabar uchun echo kelganda — dublikatdan saqlash
    // sendMessage() igMessageId=null bilan saqlaydi; echo kelganda igMessageId yangilanadi, SSE qayta chiqarilmaydi
    if (direction === 'out' && messageId) {
      const sent = await this.msgRepo.findOne({
        where: { conversationId: conv.id, direction: 'out', messageText, igMessageId: null as any },
        order: { createdAt: 'DESC' },
      });
      if (sent) {
        await this.msgRepo.update({ id: sent.id }, { igMessageId: messageId });
        return; // SSE allaqachon sendMessage() da chiqarilgan
      }
    }

    const msg = this.msgRepo.create({
      instagram_account_id: ig_account_id,
      conversationId:       conv.id,
      participantIgsid,
      igMessageId:  messageId || null,
      direction,
      messageText,
      igCreatedAt:  now,
    });
    await this.msgRepo.save(msg);

    this.emit(ig_account_id, 'new_message', { conversation: conv, message: msg });
  }

  // ─── Xabar yuborish ───────────────────────────────────────────────────────

  async sendMessage(
    creds: IgCredentials,
    participantIgsid: string,
    text: string,
  ): Promise<InboxMessage> {
    const ig_account_id = creds.accountId;

    await this.instagram.sendDM(creds, participantIgsid, text);

    let conv = await this.convRepo.findOne({
      where: { instagram_account_id: ig_account_id, participantIgsid },
    });

    if (!conv) {
      conv = this.convRepo.create({
        instagram_account_id: ig_account_id,
        participantIgsid,
        participantUsername: participantIgsid,
        lastMessage:   text,
        lastMessageAt: new Date(),
        unreadCount:   0,
      });
    } else {
      conv.lastMessage   = text;
      conv.lastMessageAt = new Date();
    }
    conv = await this.convRepo.save(conv);

    const msg = this.msgRepo.create({
      instagram_account_id: ig_account_id,
      conversationId:       conv.id,
      participantIgsid,
      direction:   'out',
      messageText: text,
      igCreatedAt: new Date(),
    });

    const saved = await this.msgRepo.save(msg);
    this.emit(ig_account_id, 'new_message', { conversation: conv, message: saved });
    return saved;
  }

  // ─── Instagram API sync ───────────────────────────────────────────────────

  async syncFromInstagram(
    creds: IgCredentials,
  ): Promise<{ synced: number; messages: number }> {
    const ig_account_id = creds.accountId;
    let syncedConvs = 0;
    let syncedMsgs  = 0;

    try {
      const igConversations = await this.instagram.getConversations(creds);

      for (const igConv of igConversations) {
        const convId = igConv.id;

        let participantIgsid    = '';
        let participantUsername = '';
        let participantName: string | null = null;
        let participantProfilePic: string | null = null;
        try {
          const participants = await this.instagram.getConversationParticipants(creds, convId);
          const other = participants.find((p: any) => p.id !== ig_account_id);
          if (other) {
            participantIgsid    = other.id       || '';
            participantUsername = other.username || other.id || '';
            try {
              const info = await this.instagram.getUserInfo(creds, participantIgsid);
              participantUsername = info.username || info.name || participantUsername;
              participantName = info.name || null;
              participantProfilePic = info.profile_pic || null;
            } catch(e) {}
          }
        } catch (e) {
          this.logger.warn(`Participants xatosi (${convId}): ${e.message}`);
        }

        if (!participantIgsid) participantIgsid = `ig_${convId}`;

        let conv = await this.convRepo.findOne({
          where: { instagram_account_id: ig_account_id, participantIgsid },
        });

        if (!conv) {
          conv = this.convRepo.create({
            instagram_account_id: ig_account_id,
            participantIgsid,
            participantUsername,
            participantName,
            participantProfilePic,
            igConversationId: convId,
            lastMessageAt: igConv.updated_time ? new Date(igConv.updated_time) : new Date(),
          });
          await this.convRepo.save(conv);
          syncedConvs++;
        } else {
          conv.igConversationId   = convId;
          conv.participantUsername = participantUsername || conv.participantUsername;
          if (participantName) conv.participantName = participantName;
          if (participantProfilePic) conv.participantProfilePic = participantProfilePic;
          await this.convRepo.save(conv);
        }

        try {
          const messages = await this.instagram.getConversationMessages(creds, convId);
          let lastMsg: { text: string; at: Date } | null = null;

          for (const igMsg of messages) {
            const exists = await this.msgRepo.findOne({ where: { igMessageId: igMsg.id } });
            if (exists) continue;

            try {
              const detail  = await this.instagram.getMessageDetail(creds, igMsg.id);
              const msgText = detail.message?.trim() || '';
              if (!msgText) continue;

              const direction: 'in' | 'out' =
                detail.from?.id === participantIgsid ? 'in' : 'out';

              const msg = this.msgRepo.create({
                instagram_account_id: ig_account_id,
                conversationId:       conv.id,
                participantIgsid,
                igMessageId:  igMsg.id,
                direction,
                messageText:  msgText,
                igCreatedAt:  detail.created_time ? new Date(detail.created_time) : new Date(),
              });
              await this.msgRepo.save(msg);
              syncedMsgs++;

              const msgAt = detail.created_time ? new Date(detail.created_time) : new Date();
              if (!lastMsg || msgAt > lastMsg.at) lastMsg = { text: msgText, at: msgAt };
            } catch (e) {
              this.logger.warn(`Message detail xatosi (${igMsg.id}): ${e.message}`);
            }
          }

          if (lastMsg) {
            conv.lastMessage   = lastMsg.text;
            conv.lastMessageAt = lastMsg.at;
            await this.convRepo.save(conv);
          }
        } catch (e) {
          this.logger.warn(`Messages xatosi (${convId}): ${e.message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Sync xatosi: ${e.message}`);
      throw e;
    }

    this.logger.log(`Sync tugadi: ${syncedConvs} suhbat, ${syncedMsgs} xabar`);
    return { synced: syncedConvs, messages: syncedMsgs };
  }

  async getUserInfo(creds: IgCredentials, igsid: string) {
    return this.instagram.getUserInfo(creds, igsid);
  }

  async resetInbox(): Promise<{ ok: boolean }> {
    await this.msgRepo.clear();
    await this.convRepo.clear();
    this.logger.log('Inbox reset qilindi');
    return { ok: true };
  }
}
