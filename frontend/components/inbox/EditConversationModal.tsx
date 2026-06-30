'use client';

import { useState } from 'react';
import { X, Tag, FileText, Loader2 } from 'lucide-react';
import { updateConversation } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import type { Conversation } from './types';

interface Props {
  conv: Conversation;
  onClose: () => void;
  onSaved: (updated: Conversation) => void;
}

const LABELS = [
  { value: 'VIP', color: 'bg-yellow-400/20 text-yellow-600 border-yellow-400/40' },
  { value: 'Mijoz', color: 'bg-blue-400/20 text-blue-600 border-blue-400/40' },
  { value: 'Yangi', color: 'bg-green-400/20 text-green-600 border-green-400/40' },
  { value: 'Muammo', color: 'bg-red-400/20 text-red-600 border-red-400/40' },
  { value: 'Kutilmoqda', color: 'bg-orange-400/20 text-orange-600 border-orange-400/40' },
  { value: 'Spam', color: 'bg-surface-container text-on-surface-variant border-outline-variant/40' },
];

export function EditConversationModal({ conv, onClose, onSaved }: Props) {
  const [label, setLabel] = useState(conv.customLabel ?? '');
  const [note, setNote]   = useState(conv.note ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateConversation(conv.id, {
        customLabel: label || null,
        note: note || null,
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
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl w-full max-w-sm flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <Avatar
              username={conv.participantUsername || conv.participantIgsid}
              profilePic={conv.participantProfilePic}
              size={36}
            />
            <div>
              <p className="text-[14px] font-semibold text-on-surface leading-tight">
                @{conv.participantUsername || conv.participantIgsid}
              </p>
              <p className="text-[12px] text-on-surface-variant">Suhbatni tahrirlash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Label */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag size={13} className="text-primary" />
              <label className="text-[13px] font-medium text-on-surface-variant">Label</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {LABELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLabel(label === l.value ? '' : l.value)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-all ${
                    label === l.value
                      ? l.color + ' ring-2 ring-offset-1 ring-primary/40'
                      : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:border-primary/30'
                  }`}
                >
                  {l.value}
                </button>
              ))}
            </div>
            {label && !LABELS.find(l => l.value === label) && (
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-xl border border-outline-variant/50 bg-surface text-on-surface text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Maxsus label..."
              />
            )}
            <button
              onClick={() => setLabel('')}
              className="mt-1.5 text-[11px] text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
            >
              {label ? 'Labelni olib tashlash' : ''}
            </button>
          </div>

          {/* Note */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={13} className="text-primary" />
              <label className="text-[13px] font-medium text-on-surface-variant">Eslatma</label>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Bu foydalanuvchi haqida eslatma yozing..."
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/50 bg-surface text-on-surface text-[13px] outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant/50 text-[14px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Saqlash
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
