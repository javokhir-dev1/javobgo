import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Ma'lumotlarni o'chirish — JavobGo",
  description: "JavobGo hisobingizni va barcha ma'lumotlaringizni qanday o'chirish mumkinligi bo'yicha ko'rsatma.",
};

export default function DataDeletionPage() {
  const lastUpdated = '2026-07-05';

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="max-w-3xl mx-auto px-6 py-12">

        <div className="mb-10">
          <Link href="/" className="text-sm text-primary hover:underline mb-6 inline-block">
            ← Bosh sahifaga qaytish
          </Link>
          <h1 className="text-3xl font-bold text-on-surface mb-2">Ma&apos;lumotlarni o&apos;chirish</h1>
          <p className="text-on-surface-variant text-sm">Oxirgi yangilanish: {lastUpdated}</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-on-surface">

          <section>
            <p className="text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">JavobGo</strong> hisobingizni va u bilan bog&apos;liq
              barcha ma&apos;lumotlarni (Telegram profil ma&apos;lumotlari, Instagram ulanishlari va
              tokenlar, agentlar, avtomatsiyalar, xabarlar, izohlar va tizim jurnallari) istalgan
              vaqtda o&apos;chirishingiz mumkin. Buning uchta yo&apos;li bor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">1-usul: Platformadan o&apos;zingiz o&apos;chirish</h2>
            <ol className="list-decimal list-inside space-y-1 text-on-surface-variant text-sm pl-2">
              <li>Telegram bot orqali platformaga kiring.</li>
              <li><strong className="text-on-surface">Profil</strong> sahifasini oching.</li>
              <li>Sahifa oxiridagi <strong className="text-on-surface">&laquo;Hisobni o&apos;chirish&raquo;</strong> tugmasini bosing.</li>
              <li>Tasdiqlash uchun <code className="text-primary">DELETE</code> deb yozing va tugmani bosing.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2-usul: Telegram bot orqali so&apos;rov</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Bizning Telegram botimizga <code className="text-primary">/murojaat</code> buyrug&apos;ini
              yuboring va ma&apos;lumotlaringizni o&apos;chirish so&apos;rovini yozing. So&apos;rov admin
              jamoasiga yetkaziladi va qayta ishlanadi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3-usul: Email orqali</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Ma&apos;lumotlarni o&apos;chirish so&apos;rovini{' '}
              <a href="mailto:javokhir.dev1@gmail.com" className="text-primary hover:underline">
                javokhir.dev1@gmail.com
              </a>{' '}
              manziliga yuboring. So&apos;rovda Telegram username yoki ID&apos;ingizni ko&apos;rsating.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">O&apos;chirish muddati</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              So&apos;rovdan so&apos;ng hisobingiz <strong className="text-on-surface">90 kunlik</strong>{' '}
              muhlatga o&apos;chirilgan deb belgilanadi. Shu muddat ichida qayta kirsangiz yoki admin
              bilan bog&apos;lansangiz — o&apos;chirish bekor qilinadi va ma&apos;lumotlaringiz tiklanadi.
              90 kundan so&apos;ng barcha ma&apos;lumotlar serverdan butunlay va qaytarib bo&apos;lmas
              tarzda o&apos;chiriladi. Qonuniy talab bilan saqlanishi shart bo&apos;lgan ayrim yozuvlar
              belgilangan muddat davomida saqlanishi mumkin.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Bog&apos;lanish</h2>
            <div className="bg-surface-container rounded-lg p-4">
              <p className="text-on-surface font-medium">&laquo;ZO&apos;R PLAY&raquo; MCHJ</p>
              <p className="text-on-surface-variant text-sm mt-1">
                Email:{' '}
                <a href="mailto:javokhir.dev1@gmail.com" className="text-primary hover:underline">
                  javokhir.dev1@gmail.com
                </a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
