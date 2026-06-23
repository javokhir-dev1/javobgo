'use client';
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import Topbar from '@/components/Topbar';
import Toggle from '@/components/Toggle';
import Alert from '@/components/Alert';
import { getSettings, updateSettings } from '@/lib/api';

export default function KeywordsPage() {
  const [enabled, setEnabled]   = useState(false);
  const [keywords, setKeywords] = useState('');
  const [alert, setAlert]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    getSettings().then(d => {
      setEnabled(d.settings.keywordsEnabled);
      setKeywords((d.settings.keywords || []).join(', '));
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const kws = keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    try {
      await updateSettings({ keywordsEnabled: enabled, keywords: kws });
      setAlert({ type: 'success', msg: 'Sozlamalar saqlandi' });
    } catch {
      setAlert({ type: 'error', msg: 'Saqlashda xato' });
    } finally {
      setSaving(false);
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean);

  return (
    <>
      <Topbar title="Kalit so'zlar" subtitle="Javob beriladigan kommentlarni filtrlash" />
      <div className="p-7 max-w-2xl">
        {alert && <Alert type={alert.type} message={alert.msg} />}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <Toggle
            checked={enabled}
            onChange={setEnabled}
            label="Kalit so'zlar filtri"
            description="Yoqilganda bot faqat kalit so'z bor kommentlarga javob beradi"
          />
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Kalit so'zlar</label>
            <input
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="narx, buy, sotib olmoqchi, qancha turadi"
              className="w-full px-4 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-accent bg-gray-50 focus:bg-white transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Vergul bilan ajrating. Masalan: <code className="bg-accent-light text-accent-dark px-1 rounded">narx, price, qancha</code>
            </p>
          </div>

          {kwList.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {kwList.map(kw => (
                <span key={kw} className="bg-accent-light text-accent text-xs font-semibold px-3 py-1 rounded-full">
                  {kw}
                </span>
              ))}
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
    </>
  );
}
