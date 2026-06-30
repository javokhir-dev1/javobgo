'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { updateConversation } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import type { Conversation } from './types';

interface Props {
  conv: Conversation;
  onClose: () => void;
  onSaved: (updated: Conversation) => void;
}

export function EditConversationModal({ conv, onClose, onSaved }: Props) {
  const [name, setName]         = useState(conv.participantName ?? '');
  const [username, setUsername] = useState(conv.participantUsername ?? '');
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!username.trim()) return;
    setSaving(true);
    try {
      const updated = await updateConversation(conv.id, {
        participantName: name.trim() || undefined,
        participantUsername: username.trim(),
      });
      onSaved({ ...conv, ...updated });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <Avatar
              username={conv.participantUsername || conv.participantIgsid}
              profilePic={conv.participantProfilePic}
              size={36}
            />
            <p className="text-[15px] font-semibold text-on-surface">Tahrirlash</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Ism</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Foydalanuvchi ismi"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-on-surface text-[14px] outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">Username</label>
            <div className="flex items-center rounded-xl border border-outline-variant/50 bg-surface focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-colors overflow-hidden">
              <span className="pl-4 text-[14px] text-on-surface-variant select-none">@</span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value.replace('@', ''))}
                placeholder="username"
                className="flex-1 px-2 py-2.5 bg-transparent text-on-surface text-[14px] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant/50 text-[14px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !username.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Saqlash
          </button>
        </div>

      </div>
    </div>
  );
}
