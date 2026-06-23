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
export const getDmMessages = () => api.get('/api/dm-messages').then(r => r.data);
export const updateDmMessages = (messages: string[]) =>
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

// Agent chat history
export const getAgentMessages = (id: number) => api.get(`/api/agents/${id}/messages`).then(r => r.data);
export const saveAgentMessage = (id: number, role: string, text: string) =>
  api.post(`/api/agents/${id}/messages`, { role, text }).then(r => r.data);
export const clearAgentMessages = (id: number) => api.delete(`/api/agents/${id}/messages`).then(r => r.data);

// Inbox
export const getConversations = () => api.get('/api/inbox/conversations').then(r => r.data);
export const getInboxMessages = (conversationId: number) =>
  api.get(`/api/inbox/conversations/${conversationId}/messages`).then(r => r.data);
export const sendInboxMessage = (igsid: string, text: string) =>
  api.post(`/api/inbox/conversations/${igsid}/send`, { text }).then(r => r.data);
export const syncInbox = () => api.post('/api/inbox/sync').then(r => r.data);
export const getInboxUserInfo = (igsid: string) => api.get(`/api/inbox/user/${igsid}`).then(r => r.data);
export const resetInbox = () => api.post('/api/inbox/reset').then(r => r.data);
export const getInboxEventsUrl = () => '/api/inbox/events';
