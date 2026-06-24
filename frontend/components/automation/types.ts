export interface Automation {
  id: number;
  name: string;
  triggerType: 'any' | 'keyword';
  keywords: string[];
  replyEnabled: boolean;
  replyTemplates: string[];
  dmEnabled: boolean;
  dmTemplates: string[];
  postScope: 'all' | 'specific';
  postIds: string[];
  postData: { id: string; caption?: string; thumbnail?: string }[];
  isActive: boolean;
  createdAt: string;
}

export interface FormState {
  name: string;
  triggerType: 'any' | 'keyword';
  keywords: string[];
  replyEnabled: boolean;
  replyTemplates: string[];
  dmEnabled: boolean;
  dmTemplates: string[];
  postScope: 'all' | 'specific';
  postIds: string[];
  postData: { id: string; caption?: string; thumbnail?: string }[];
  replyAgentId: number | null;
  dmAgentId: number | null;
}

export const EMPTY_FORM: FormState = {
  name: '',
  triggerType: 'any',
  keywords: [],
  replyEnabled: false,
  replyTemplates: [''],
  dmEnabled: false,
  dmTemplates: [''],
  postScope: 'all',
  postIds: [],
  postData: [],
  replyAgentId: null,
  dmAgentId: null,
};
