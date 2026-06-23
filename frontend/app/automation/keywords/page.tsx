'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Toggle from '@/components/Toggle';
import Alert from '@/components/Alert';
import { getSettings, updateSettings } from '@/lib/api';

export default function KeywordsFullPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(d => { setEnabled(d.settings.keywordsEnabled); setKeywords((d.settings.keywords || []).join(', ')); });
  }, []);

  const save = async () => {
    setSaving(true);
    const kws = keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    try { await updateSettings({ keywordsEnabled: enabled, keywords: kws }); setAlert({ type: 'success', msg: 'Sozlamalar saqlandi' }); }
    catch { setAlert({ type: 'error', msg: 'Saqlashda xato' }); }
    finally { setSaving(false); setTimeout(() => setAlert(null), 3000); }
  };

  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-[#f7f9fb] flex flex-col overflow-hidden">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-5 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.push('/automation')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-[20px] font-semibold text-slate-900 leading-tight">Kalit so'zlar</h2>
          <p className="text-[13px] text-slate-400">Javob beriladigan kommentlarni filtrlash</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-5">
          {alert && <Alert type={alert.type} message={alert.msg} />}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <Toggle checked={enabled} onChange={setEnabled} label="Kalit so'zlar filtri" description="Yoqilganda bot faqat kalit so'z bor kommentlarga javob beradi" />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Kalit so'zlar</label>
              <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
                placeholder="narx, buy, sotib olmoqchi, qancha turadi"
                className="w-full px-4 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-accent bg-gray-50 focus:bg-white transition-colors" />
              <p className="text-xs text-gray-400 mt-1.5">
                Vergul bilan ajrating. Masalan: <code className="bg-accent-light text-accent-dark px-1 rounded">narx, price, qancha</code>
              </p>
            </div>
            {kwList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {kwList.map(kw => <span key={kw} className="bg-accent-light text-accent text-xs font-semibold px-3 py-1 rounded-full">{kw}</span>)}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60">
                <Save size={15} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
