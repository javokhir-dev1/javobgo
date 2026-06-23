'use client';
import { useEffect, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import Topbar from '@/components/Topbar';
import Toggle from '@/components/Toggle';
import Alert from '@/components/Alert';
import { getSettings, updateSettings, getDmMessages, updateDmMessages } from '@/lib/api';

export default function DmPage() {
  const [dmAutoReplyEnabled, setDmAutoReplyEnabled] = useState(false);
  const [messages, setMessages]   = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(d => {
      setDmAutoReplyEnabled(d.settings.dmAutoReplyEnabled ?? false);
    });
    getDmMessages().then(d => {
      setMessages(d.messages);
      setCurrentIndex(d.currentIndex);
    });
  }, []);

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({ dmAutoReplyEnabled });
      showAlert('success', 'Sozlamalar saqlandi');
    } catch { showAlert('error', 'Xato'); }
    finally { setSaving(false); }
  };

  const saveDmMessages = async () => {
    const filtered = messages.filter(m => m.trim());
    if (filtered.length === 0) return showAlert('error', 'Kamida 1 ta xabar kerak');
    setSaving(true);
    try {
      await updateDmMessages(filtered);
      setMessages(filtered);
      setCurrentIndex(0);
      showAlert('success', 'DM xabarlar saqlandi');
    } catch { showAlert('error', 'Xato'); }
    finally { setSaving(false); }
  };

  const updateMsg = (i: number, val: string) => { const c = [...messages]; c[i] = val; setMessages(c); };
  const removeMsg = (i: number) => { if (messages.length <= 1) return showAlert('error', 'Kamida 1 ta xabar'); setMessages(messages.filter((_, idx) => idx !== i)); };
  const addMsg    = () => setMessages([...messages, '']);

  return (
    <>
      <Topbar title="DM avto javob" subtitle="Kiruvchi xabarlarga avtomatik javob" />
      <div className="p-7 max-w-2xl space-y-5">
        {alert && <Alert type={alert.type} message={alert.msg} />}

        {/* On/Off toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <Toggle
            checked={dmAutoReplyEnabled}
            onChange={setDmAutoReplyEnabled}
            label="DM Avtojavobni yoqish"
            description="Kimdir DM yozganida aylanadigan xabarlardan javob yuboradi"
          />
          <div className="flex justify-end mt-4">
            <button onClick={saveSettings} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60">
              <Save size={15} /> Saqlash
            </button>
          </div>
        </div>

        {/* Aylanadigan xabarlar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-gray-900">Aylanadigan xabarlar</div>
            <span className="text-xs bg-accent-light text-accent font-semibold px-2.5 py-1 rounded-full">
              Keyingi: {currentIndex + 1}/{messages.length || 1}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-5">Har bir yangi DM ga navbat bilan yuboriladi.</p>

          <div className="space-y-2.5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 items-start border-[1.5px] rounded-xl px-3 py-2.5 transition-colors ${
                i === currentIndex ? 'border-accent bg-accent-light/40' : 'border-gray-100 bg-gray-50'
              }`}>
                <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 ${
                  i === currentIndex ? 'bg-accent text-white' : 'bg-accent-light text-accent'
                }`}>{i + 1}</div>
                <textarea
                  rows={2}
                  value={msg}
                  onChange={e => updateMsg(i, e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 resize-none leading-relaxed"
                />
                <button onClick={() => removeMsg(i)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <button onClick={addMsg}
              className="flex items-center gap-1.5 text-sm px-4 py-2 border-[1.5px] border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              <Plus size={14} /> Xabar qo'shish
            </button>
            <button onClick={saveDmMessages} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60">
              <Save size={15} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
