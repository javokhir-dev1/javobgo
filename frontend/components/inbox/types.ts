export interface Conversation {
  id: number;
  igConversationId: string;
  participantIgsid: string;
  participantUsername: string;
  participantName: string | null;
  participantProfilePic: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageTimestampMs: string | null;
  unreadCount: number;
  updatedAt: string;
  customLabel?: string | null;
  note?: string | null;
}

export interface InboxMessage {
  id: number;
  conversationId: number;
  participantIgsid: string;
  direction: 'in' | 'out';
  messageText: string;
  igCreatedAt: string;
  timestampMs: string | null;
  createdAt: string;
  pending?: boolean;
}

export interface UserInfo {
  id: string;
  username?: string;
  name?: string;
  profile_pic?: string;
}

export function formatTime(dateStr: string | null, t: (key: string) => string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('inbox.time.now');
  if (mins < 60) return `${mins}${t('inbox.time.m')}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t('inbox.time.h')}`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}${t('inbox.time.d')}`;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}
