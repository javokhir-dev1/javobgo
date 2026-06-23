'use client';
import Topbar from '@/components/Topbar';

const steps = [
  {
    n: 1,
    title: 'Meta Developer hisobini oching',
    desc: 'developers.facebook.com ga kiring, App yarating, Instagram sozlamalariga kiring.',
    link: { href: 'https://developers.facebook.com', label: 'developers.facebook.com' },
  },
  {
    n: 2,
    title: 'Webhook URL kiriting',
    desc: "Webhooks bo'limiga o'ting, Instagram ni tanlang, Obuna qo'shing. Quyidagi URL ni nusxa oling:",
    codeFactory: () =>
      typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:4000/webhook`
        : 'http://your-domain.com:4000/webhook',
  },
  {
    n: 3,
    title: 'Verify Token kiriting',
    desc: 'backend/.env dagi WEBHOOK_VERIFY_TOKEN qiymatini Meta ga kiriting.',
  },
  {
    n: 4,
    title: 'Fieldlarni yoqing',
    desc: 'Subscribe qilgandan so\'ng messages va comments fieldlarini yoqing.',
  },
  {
    n: 5,
    title: 'Tashqi URL (mahalliy server uchun)',
    desc: 'Cloudflare Tunnel yoki ngrok orqali backendni internetga chiqaring:',
    code: 'cloudflared tunnel --url http://localhost:4000',
  },
];

export default function WebhookPage() {
  return (
    <>
      <Topbar title="Webhook" subtitle="Meta bilan ulanish sozlamalari" />
      <div className="p-7 max-w-2xl space-y-5">

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="text-sm font-semibold text-gray-900 mb-6">Webhook sozlash</div>
          <div className="space-y-6">
            {steps.map(step => (
              <div key={step.n} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step.n}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">{step.title}</div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    {step.desc}
                    {step.link && (
                      <> &nbsp;<a href={step.link.href} target="_blank" className="text-accent underline">{step.link.label}</a></>
                    )}
                  </p>
                  {(step.code || step.codeFactory) && (
                    <div className="mt-2 bg-sidebar text-purple-300 px-4 py-3 rounded-xl font-mono text-xs break-all">
                      {step.codeFactory ? step.codeFactory() : step.code}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="text-sm font-semibold text-gray-900 mb-4">backend/.env</div>
          <div className="bg-sidebar text-purple-200 px-5 py-4 rounded-xl font-mono text-xs leading-7">
            <span className="text-gray-500"># Server</span><br />
            PORT=<span className="text-yellow-300">4000</span><br /><br />
            <span className="text-gray-500"># PostgreSQL</span><br />
            DB_HOST=<span className="text-yellow-300">localhost</span><br />
            DB_PORT=<span className="text-yellow-300">5432</span><br />
            DB_USERNAME=<span className="text-yellow-300">postgres</span><br />
            DB_PASSWORD=<span className="text-yellow-300">yourpassword</span><br />
            DB_DATABASE=<span className="text-yellow-300">instabot</span><br /><br />
            <span className="text-gray-500"># Instagram</span><br />
            INSTAGRAM_ACCESS_TOKEN=<span className="text-yellow-300">your_token</span><br />
            INSTAGRAM_BUSINESS_ACCOUNT_ID=<span className="text-yellow-300">your_id</span><br />
            INSTAGRAM_APP_ID=<span className="text-yellow-300">your_app_id</span><br />
            INSTAGRAM_APP_SECRET=<span className="text-yellow-300">your_secret</span><br />
            WEBHOOK_VERIFY_TOKEN=<span className="text-yellow-300">your_token</span><br /><br />
            <span className="text-gray-500"># CORS</span><br />
            FRONTEND_URL=<span className="text-yellow-300">http://localhost:3000</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="text-sm font-semibold text-gray-900 mb-4">frontend/.env.local</div>
          <div className="bg-sidebar text-purple-200 px-5 py-4 rounded-xl font-mono text-xs">
            NEXT_PUBLIC_API_URL=<span className="text-yellow-300">http://localhost:4000</span>
          </div>
        </div>

      </div>
    </>
  );
}
