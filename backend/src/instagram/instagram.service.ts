import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const BASE_URL = 'https://graph.instagram.com/v21.0';

export interface IgCredentials {
  token: string;
  accountId: string;
}

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  async replyToComment(creds: IgCredentials, commentId: string, text: string) {
    const res = await axios.post(`${BASE_URL}/${commentId}/replies`, {
      message: text,
      access_token: creds.token,
    });
    return res.data;
  }

  async sendDM(creds: IgCredentials, recipientId: string, text: string) {
    const res = await axios.post(`${BASE_URL}/${creds.accountId}/messages`, {
      recipient: { id: recipientId },
      message: { text },
      access_token: creds.token,
    });
    return res.data;
  }

  async sendDMWithButton(
    creds: IgCredentials,
    recipientId: string,
    text: string,
    buttonTitle: string,
    buttonUrl: string,
  ) {
    const res = await axios.post(`${BASE_URL}/${creds.accountId}/messages`, {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'cta_url',
            payload: {
              url: buttonUrl,
              button_title: buttonTitle,
            },
            text,
          },
        },
      },
      access_token: creds.token,
    });
    return res.data;
  }

  async sendDMButtons(
    creds: IgCredentials,
    recipientId: string,
    text: string,
    buttons: { title: string; url: string }[],
  ) {
    const res = await axios.post(`${BASE_URL}/${creds.accountId}/messages`, {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text,
            buttons: buttons.slice(0, 3).map(b => ({
              type: 'web_url',
              url: b.url,
              title: b.title,
            })),
          },
        },
      },
      access_token: creds.token,
    });
    return res.data;
  }

  async getAccountInfo(creds: IgCredentials) {
    const res = await axios.get(`${BASE_URL}/${creds.accountId}`, {
      params: {
        fields: 'id,username,followers_count,media_count',
        access_token: creds.token,
      },
    });
    return res.data;
  }

  async getRecentPosts(creds: IgCredentials, limit = 20) {
    const res = await axios.get(`${BASE_URL}/${creds.accountId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,timestamp,like_count,comments_count',
        limit,
        access_token: creds.token,
      },
    });
    return res.data.data as any[];
  }

  async getConversations(creds: IgCredentials): Promise<any[]> {
    const res = await axios.get(`${BASE_URL}/me/conversations`, {
      params: { platform: 'instagram', access_token: creds.token },
    });
    return res.data?.data || [];
  }

  async getConversationMessages(creds: IgCredentials, conversationId: string): Promise<any[]> {
    const res = await axios.get(`${BASE_URL}/${conversationId}`, {
      params: { fields: 'messages,participants', access_token: creds.token },
    });
    return res.data?.messages?.data || [];
  }

  async getConversationParticipants(creds: IgCredentials, conversationId: string): Promise<any> {
    const res = await axios.get(`${BASE_URL}/${conversationId}`, {
      params: { fields: 'participants', access_token: creds.token },
    });
    return res.data?.participants?.data || [];
  }

  async getMessageDetail(creds: IgCredentials, messageId: string): Promise<any> {
    const res = await axios.get(`${BASE_URL}/${messageId}`, {
      params: { fields: 'id,created_time,from,to,message', access_token: creds.token },
    });
    return res.data;
  }

  async getUserInfo(creds: IgCredentials, igsid: string): Promise<{
    id: string; username?: string; name?: string; profile_pic?: string;
  }> {
    const res = await axios.get(`${BASE_URL}/${igsid}`, {
      params: { fields: 'id,username,name,profile_pic', access_token: creds.token },
    });
    return res.data;
  }
}
