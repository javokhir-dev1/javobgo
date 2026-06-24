'use client';

import { useEffect, useState } from 'react';
import { X, Instagram } from 'lucide-react';
import { getInboxUserInfo } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { avatarColor } from '@/components/ui/Avatar';
import type { Conversation, UserInfo } from './types';

interface Props {
  igsid: string;
  conv: Conversation;
  onClose: () => void;
}

export function ProfileModal({ igsid, conv, onClose }: Props) {
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgZoom, setImgZoom] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    getInboxUserInfo(igsid)
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [igsid]);

  const pic = info?.profile_pic || conv.participantProfilePic;
  const username = info?.username || conv.participantUsername;
  const name = info?.name || conv.participantName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>

        <div className="flex justify-end p-3 pb-0">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-6 pb-6 flex flex-col items-center text-center">
            {pic ? (
              <>
                <button onClick={() => setImgZoom(true)} className="mb-3 rounded-full hover:opacity-90 transition-opacity focus:outline-none">
                  <img src={pic} alt={username} className="w-20 h-20 rounded-full object-cover border-2 border-outline-variant/30" referrerPolicy="no-referrer" />
                </button>
                {imgZoom && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setImgZoom(false)}>
                    <img src={pic} alt={username} className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} referrerPolicy="no-referrer" />
                    <button onClick={() => setImgZoom(false)} className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: avatarColor(username || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 32 }} className="mb-3">
                {(username || '?')[0].toUpperCase()}
              </div>
            )}

            {name && <p className="text-[16px] font-semibold text-on-surface">{name}</p>}
            <p className="text-[14px] text-on-surface-variant mt-0.5">@{username}</p>

            <a href={`https://instagram.com/${username}`} target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-[13px] text-primary hover:underline">
              <Instagram size={14} />
              {t('inbox.profile.viewOnInstagram')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
