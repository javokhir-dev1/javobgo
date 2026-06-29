'use client';
import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Link2, X } from 'lucide-react';
import Topbar from '@/components/Topbar';
import Toggle from '@/components/Toggle';
import Alert from '@/components/Alert';
import { getSettings, updateSettings, getDmMessages, updateDmMessages, DmMessageItem } from '@/lib/api';

export default function DmPage() {
  const [dmAutoReplyEnabled, setDmAutoReplyEnabled] = useState(false);
  const [messages, setMessages] = useState<DmMessageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(d => {
      setDmAutoReplyEnabled(d.settings.dmAutoReplyEnabled ?? false);
    });
    getDmMessages().then(d => {
      setMessages(d.messages.length ? d.messages : [{ text: '' }]);
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
    const filtered = messages.filter(m => m.text.trim());
    if (filtered.length === 0) return showAlert('error', 'Kamida 1 ta xabar kerak');
    // Validate: if buttonText or buttonUrl provided, both must be present
    for (const m of filtered) {
      if ((m.buttonText && !m.buttonUrl) || (!m.buttonText && m.buttonUrl)) {
        return showAlert('error', 'Tugma matni va URL ikkalasi ham to\'ldirilishi kerak');
      }
    }
    setSaving(true);
    try {
      await updateDmMessages(filtered);
      setMessages(filtered);
      setCurrentIndex(0);
      showAlert('success', 'DM xabarlar saqlandi');
    } catch { showAlert('error', 'Xato'); }
    finally { setSaving(false); }
  };

  const updateMsg = (i: number, field: keyof DmMessageItem, val: string) => {
    const c = [...messages];
    c[i] = { ...c[i], [field]: val };
    setMessages(c);
  };

  const toggleButton = (i: number) => {
    const c = [...messages];
    if (c[i].buttonText !== undefined) {
      c[i] = { ...c[i], buttonText: undefined, buttonUrl: undefined };
    } else {
      c[i] = { ...c[i], buttonText: '', buttonUrl: '' };
    }
    setMessages(c);
  };

  const removeMsg = (i: number) => {
    if (messages.length <= 1) return showAlert('error', 'Kamida 1 ta xabar');
    setMessages(messages.filter((_, idx) => idx !== i));
  };
  const addMsg = () => setMessages([...messages, { text: '' }]);

  return (
    <>
      <Topbar title="DM avto javob" subtitle="Kiruvchi xabarlarga avtomatik javob" />
      <div className="p-4 md:p-7 max-w-2xl space-y-5">
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

          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`border-[1.5px] rounded-xl transition-colors ${
                i === currentIndex ? 'border-accent bg-accent-light/40' : 'border-gray-100 bg-gray-50'
              }`}>
                {/* Text row */}
                <div className="flex gap-2.5 items-start px-3 py-2.5">
                  <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 ${
                    i === currentIndex ? 'bg-accent text-white' : 'bg-accent-light text-accent'
                  }`}>{i + 1}</div>
                  <textarea
                    rows={2}
                    value={msg.text}
                    onChange={e => updateMsg(i, 'text', e.target.value)}
                    placeholder="Xabar matni..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 resize-none leading-relaxed"
                  />
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleButton(i)}
                      title={msg.buttonText !== undefined ? 'Tugmani olib tashlash' : 'URL tugma qo\'shish'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        msg.buttonText !== undefined
                          ? 'text-accent bg-accent-light hover:bg-accent/20'
                          : 'text-gray-400 hover:text-accent hover:bg-accent-light'
                      }`}>
                      <Link2 size={14} />
                    </button>
                    <button onClick={() => removeMsg(i)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Button URL fields */}
                {msg.buttonText !== undefined && (
                  <div className="border-t border-dashed border-gray-200 mx-3 pt-2.5 pb-2.5 flex gap-2">
                    <input
                      type="text"
                      value={msg.buttonText || ''}
                      onChange={e => updateMsg(i, 'buttonText', e.target.value)}
                      placeholder="Tugma matni (mas: Ko'proq)"
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-accent bg-white"
                    />
                    <input
                      type="url"
                      value={msg.buttonUrl || ''}
                      onChange={e => updateMsg(i, 'buttonUrl', e.target.value)}
                      placeholder="https://..."
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-accent bg-white"
                    />
                  </div>
                )}
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
