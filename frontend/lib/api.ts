import axios from 'axios';

// Barcha so'rovlar same-origin ga (Next.js rewrite orqali backend ga uzatiladi)
// Bu cookie muammosini hal qiladi — credentials: "include" shart emas
const api = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : (process.env.BACKEND_URL || 'http://localhost:4000'),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { api };

// Settings
export const getSettings = () => api.get('/api/settings').then(r => r.data);
export const updateSettings = (data: any) => api.patch('/api/settings', data).then(r => r.data);

// Instagram status
export const getInstagramStatus   = () => api.get('/api/instagram/status').then(r => r.data);
export const getInstagramAccounts = () => api.get('/api/instagram/accounts').then(r => r.data) as Promise<{ instagram_account_id: string; instagram_username: string; is_selected: boolean }[]>;
export const selectInstagramAccount    = (igId: string) => api.post(`/api/instagram/account/${igId}/select`).then(r => r.data);
export const disconnectInstagramAccount = (igId: string) => api.delete(`/api/instagram/account/${igId}`).then(r => r.data);
export const getInstagramPosts  = () => api.get('/api/instagram/posts').then(r => r.data);

// DM Messages
export interface DmMessageItem { text: string; buttonText?: string | null; buttonUrl?: string | null; }
export const getDmMessages = () => api.get('/api/dm-messages').then(r => r.data);
export const updateDmMessages = (messages: DmMessageItem[]) =>
  api.put('/api/dm-messages', { messages }).then(r => r.data);

// Logs
export const getLogs = (limit = 100) =>
  api.get(`/api/logs?limit=${limit}`).then(r => r.data);
export const getTodayStats = () =>
  api.get('/api/logs/today-stats').then(r => r.data);

// Agents
export const getAgents = () => api.get('/api/agents').then(r => r.data);
export const getAgent  = (id: number) => api.get(`/api/agents/${id}`).then(r => r.data);
export const createAgent = (data: any) => api.post('/api/agents', data).then(r => r.data);
export const updateAgent = (id: number, data: any) => api.patch(`/api/agents/${id}`, data).then(r => r.data);
export const deleteAgent = (id: number) => api.delete(`/api/agents/${id}`).then(r => r.data);
export const chatWithAgent = (id: number, messages: { role: string; text: string }[]) =>
  api.post(`/api/agents/${id}/chat`, { messages }).then(r => r.data);

export const streamChatWithAgent = async (
  id: number,
  messages: { role: string; text: string }[],
  onChunk: (text: string) => void,
): Promise<void> => {
  const res = await fetch(`/api/agents/${id}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.body) throw new Error('Stream not supported');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.text) onChunk(parsed.text);
      } catch {}
    }
  }
};

// Automations
export const getAutomations = () => api.get('/api/automations').then(r => r.data);
export const getAutomation = (id: number) => api.get(`/api/automations/${id}`).then(r => r.data);
export const createAutomation = (data: any) => api.post('/api/automations', data).then(r => r.data);
export const updateAutomation = (id: number, data: any) => api.patch(`/api/automations/${id}`, data).then(r => r.data);
export const toggleAutomation = (id: number) => api.patch(`/api/automations/${id}/toggle`).then(r => r.data);
export const deleteAutomation = (id: number) => api.delete(`/api/automations/${id}`).then(r => r.data);

// Comment Rules
export const getCommentRules = () => api.get('/api/comment-rules').then(r => r.data);
export const createCommentRule = (data: any) => api.post('/api/comment-rules', data).then(r => r.data);
export const updateCommentRule = (id: number, data: any) => api.patch(`/api/comment-rules/${id}`, data).then(r => r.data);
export const deleteCommentRule = (id: number) => api.delete(`/api/comment-rules/${id}`).then(r => r.data);
export const toggleCommentRule = (id: number) => api.patch(`/api/comment-rules/${id}/toggle`).then(r => r.data);

export const getGlobalRule = () =>
  getCommentRules().then(d => (d.rules || []).find((r: any) => r.postId === '__global__') || null);

// Agent documents
export const getAgentDocuments = (id: number) => api.get(`/api/agents/${id}/documents`).then(r => r.data);
export const uploadAgentDocument = (id: number, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/api/agents/${id}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
export const deleteAgentDocument = (agentId: number, docId: number) =>
  api.delete(`/api/agents/${agentId}/documents/${docId}`).then(r => r.data);

// Agent chat history
export const getAgentMessages = (id: number) => api.get(`/api/agents/${id}/messages`).then(r => r.data);
export const saveAgentMessage = (id: number, role: string, text: string) =>
  api.post(`/api/agents/${id}/messages`, { role, text }).then(r => r.data);
export const clearAgentMessages = (id: number) => api.delete(`/api/agents/${id}/messages`).then(r => r.data);

// Inbox
export const getConversations = () => api.get('/api/inbox/conversations').then(r => r.data);
export const deleteConversation = (id: number) => api.delete(`/api/inbox/conversations/${id}`).then(r => r.data);
export const getInboxMessages = (conversationId: number) =>
  api.get(`/api/inbox/conversations/${conversationId}/messages`).then(r => r.data);
export const sendInboxMessage = (igsid: string, text: string, buttons?: { title: string; url: string }[]) =>
  api.post(`/api/inbox/conversations/${igsid}/send`, { text, buttons }).then(r => r.data);
export const syncInbox = () => api.post('/api/inbox/sync').then(r => r.data);
export const getInboxUserInfo = (igsid: string) => api.get(`/api/inbox/user/${igsid}`).then(r => r.data);
export const resetInbox = () => api.post('/api/inbox/reset').then(r => r.data);
export const getInboxEventsUrl = () => '/api/inbox/events';

// Admin API
export const adminGetStats        = () => api.get('/api/admin/stats').then(r => r.data);
export const adminGetHourlyStats  = () => api.get('/api/admin/stats/hourly').then(r => r.data);
export const adminGetUsers        = (page = 1, limit = 20) => api.get(`/api/admin/users?page=${page}&limit=${limit}`).then(r => r.data);
export const adminSetUserRole     = (telegramId: string, role: 'user' | 'admin') => api.patch(`/api/admin/users/${telegramId}/role`, { role }).then(r => r.data);
export const adminGetRateLimit    = () => api.get('/api/admin/rate-limit').then(r => r.data);
export const adminGetConfig       = () => api.get('/api/admin/rate-limit/config').then(r => r.data);
export const adminUpdateConfig    = (data: { maxRequestsPerHour?: number; warningThresholdPct?: number; dmLimit?: number; commentLimit?: number }) => api.patch('/api/admin/rate-limit/config', data).then(r => r.data);
export const adminSetMaintenance  = (enabled: boolean) => api.post('/api/admin/maintenance', { enabled }).then(r => r.data);
export const adminBlockAccount    = (id: string) => api.post('/api/admin/rate-limit/block', { instagram_account_id: id }).then(r => r.data);
export const adminUnblockAccount  = (id: string) => api.delete(`/api/admin/rate-limit/block/${id}`).then(r => r.data);
export const adminSetCustomLimit  = (igId: string, customLimit: number | null) => api.patch(`/api/admin/rate-limit/override/${igId}`, { customLimit }).then(r => r.data);
export const adminGetRequests     = (page = 1, limit = 50, telegramId?: string, igAccountId?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (telegramId)  params.set('telegramId', telegramId);
  if (igAccountId) params.set('igAccountId', igAccountId);
  return api.get(`/api/admin/requests?${params}`).then(r => r.data);
};
export const adminGetEndpoints    = () => api.get('/api/admin/endpoints').then(r => r.data);
export const adminGetIgTokens     = () => api.get('/api/admin/ig-tokens').then(r => r.data);
export const adminExportRequests  = (telegramId?: string, igAccountId?: string) => {
  const params = new URLSearchParams();
  if (telegramId)  params.set('telegramId', telegramId);
  if (igAccountId) params.set('igAccountId', igAccountId);
  if (igAccountId) params.set('igAccountId', igAccountId);
  return `/api/admin/requests/export?${params}`;
};

export const adminGetAutomations  = () => api.get('/api/admin/automations').then(r => r.data);
export const adminGetAgents       = () => api.get('/api/admin/agents').then(r => r.data);

