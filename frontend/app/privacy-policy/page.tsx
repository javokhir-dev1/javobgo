import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Maxfiylik Siyosati — JavobGo",
  description: "JavobGo xizmatining maxfiylik siyosati va foydalanuvchi ma'lumotlarini himoya qilish tartibi.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "2025-01-01";

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm text-primary hover:underline mb-6 inline-block">
            ← Bosh sahifaga qaytish
          </Link>
          <h1 className="text-3xl font-bold text-on-surface mb-2">Maxfiylik Siyosati</h1>
          <p className="text-on-surface-variant text-sm">
            Oxirgi yangilanish: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-on-surface">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Kirish</h2>
            <p className="text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">JavobGo</strong> — Instagram biznes akkauntlari uchun
              avtomatik javob berish xizmatidir. Ushbu maxfiylik siyosati{' '}
              <strong className="text-on-surface">&laquo;ZO&apos;R PLAY&raquo; MCHJ</strong> tomonidan
              ko&apos;rsatiladigan xizmat doirasida foydalanuvchilar ma&apos;lumotlari qanday to&apos;planishi,
              ishlatilishi va himoya qilinishini belgilaydi.
            </p>
            <p className="text-on-surface-variant leading-relaxed mt-2">
              Xizmatdan foydalanish orqali siz ushbu siyosatga rozilik bildirasiz.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">2. To&apos;planadigan ma&apos;lumotlar</h2>
            <p className="text-on-surface-variant leading-relaxed mb-3">
              Xizmatdan foydalanish davomida quyidagi ma&apos;lumotlar to&apos;planishi mumkin:
            </p>
            <div className="space-y-3">
              <div className="bg-surface-container rounded-lg p-4">
                <h3 className="font-medium text-on-surface mb-1">Telegram orqali avtorizatsiya</h3>
                <p className="text-on-surface-variant text-sm">
                  Telegram foydalanuvchi ID, ism va username. Parol yoki maxfiy ma&apos;lumotlar saqlanmaydi.
                </p>
              </div>
              <div className="bg-surface-container rounded-lg p-4">
                <h3 className="font-medium text-on-surface mb-1">Instagram akkaunt ma&apos;lumotlari</h3>
                <p className="text-on-surface-variant text-sm">
                  Instagram biznes akkaunt ID, username va Meta tomonidan berilgan kirish tokeni (access token).
                  Token faqat sizning nomingizdan API so&apos;rovlari yuborish uchun ishlatiladi.
                </p>
              </div>
              <div className="bg-surface-container rounded-lg p-4">
                <h3 className="font-medium text-on-surface mb-1">Xabarlar va izohlar</h3>
                <p className="text-on-surface-variant text-sm">
                  Sizning Instagram akkauntingizga kelgan DM (shaxsiy xabarlar) va post izohlari
                  faqat avtomatik javob berish maqsadida qayta ishlanadi. Bu ma&apos;lumotlar
                  uchinchi shaxslarga berilmaydi.
                </p>
              </div>
              <div className="bg-surface-container rounded-lg p-4">
                <h3 className="font-medium text-on-surface mb-1">Foydalanish jurnali</h3>
                <p className="text-on-surface-variant text-sm">
                  Xizmat ishlashini tahlil qilish uchun yuborilgan javoblar, xato xabarlari va
                  tizim jurnallari saqlanadi.
                </p>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">3. Ma&apos;lumotlardan foydalanish maqsadi</h2>
            <p className="text-on-surface-variant leading-relaxed mb-2">
              To&apos;plangan ma&apos;lumotlar faqat quyidagi maqsadlarda ishlatiladi:
            </p>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant text-sm pl-2">
              <li>Instagram izohlari va DM larga avtomatik javob berish</li>
              <li>Foydalanuvchi autentifikatsiyasi va sessiyasini boshqarish</li>
              <li>Xizmat unumdorligini tahlil qilish va yaxshilash</li>
              <li>Instagram API token larini yangilash va boshqarish</li>
              <li>Texnik muammolarni aniqlash va bartaraf etish</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">4. Meta (Instagram) API dan foydalanish</h2>
            <p className="text-on-surface-variant leading-relaxed mb-2">
              JavobGo quyidagi Meta API ruxsatlaridan foydalanadi:
            </p>
            <div className="space-y-2">
              {[
                { perm: "instagram_business_basic", desc: "Asosiy akkaunt ma'lumotlarini o'qish" },
                { perm: "instagram_business_manage_messages", desc: "DM xabarlarini o'qish va javob berish" },
                { perm: "instagram_business_manage_comments", desc: "Post izohlarini boshqarish va javob berish" },
                { perm: "instagram_business_content_publish", desc: "Kontent nashr etish (ixtiyoriy)" },
              ].map(({ perm, desc }) => (
                <div key={perm} className="flex gap-3 bg-surface-container-low rounded-lg p-3">
                  <code className="text-xs text-primary font-mono whitespace-nowrap">{perm}</code>
                  <span className="text-on-surface-variant text-sm">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-on-surface-variant text-sm mt-3">
              Bu ruxsatlar faqat siz tomonidan ulanilgan Instagram akkauntingiz uchun ishlaydi.
              Boshqa foydalanuvchilarning ma&apos;lumotlariga kirish imkoni yo&apos;q.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Ma&apos;lumotlarni saqlash va xavfsizlik</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Barcha ma&apos;lumotlar xavfsiz server muhitida shifrlangan holda saqlanadi.
              Instagram kirish tokenlari shifrlanib bazada saqlanadi va faqat API so&apos;rovlari uchun
              ishlatiladi. Biz ma&apos;lumotlarni uchinchi shaxslarga sotmaymiz, ijaraga bermaymiz yoki
              tijorat maqsadlarida almashmaymiz.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">6. Foydalanuvchi huquqlari</h2>
            <p className="text-on-surface-variant leading-relaxed mb-2">
              Siz istalgan vaqtda quyidagi harakatlarni amalga oshirishingiz mumkin:
            </p>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant text-sm pl-2">
              <li>Instagram akkauntingizni xizmatdan uzish</li>
              <li>Saqlangan barcha ma&apos;lumotlaringizni o&apos;chirish so&apos;rovini yuborish</li>
              <li>Avtomatik javob berish xizmatini istalgan vaqtda o&apos;chirish</li>
            </ul>
            <p className="text-on-surface-variant text-sm mt-3">
              Ma&apos;lumotlarni o&apos;chirish uchun admin bilan bog&apos;laning.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Uchinchi tomon xizmatlari</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Xizmat quyidagi tashqi platformalar bilan integratsiya qilingan:
            </p>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant text-sm pl-2 mt-2">
              <li><strong className="text-on-surface">Meta (Instagram/Facebook)</strong> — API orqali xabarlarni boshqarish</li>
              <li><strong className="text-on-surface">Telegram</strong> — foydalanuvchi autentifikatsiyasi</li>
              <li><strong className="text-on-surface">Google Gemini AI</strong> — avtomatik javoblar yaratish (AI rejimida)</li>
            </ul>
            <p className="text-on-surface-variant text-sm mt-3">
              Ushbu platformalarning o&apos;z maxfiylik siyosatlari mavjud bo&apos;lib, ular alohida qo&apos;llaniladi.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">8. O&apos;zgarishlar</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Ushbu siyosat vaqti-vaqti bilan yangilanishi mumkin. Muhim o&apos;zgarishlar haqida
              Telegram orqali xabar beriladi. Xizmatdan doimiy foydalanish yangi siyosatga
              rozilikni anglatadi.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">9. Bog&apos;lanish</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Maxfiylik siyosati bo&apos;yicha savollar yoki ma&apos;lumotlarni o&apos;chirish so&apos;rovlari uchun:
            </p>
            <div className="bg-surface-container rounded-lg p-4 mt-3">
              <p className="text-on-surface font-medium">&laquo;ZO&apos;R PLAY&raquo; MCHJ</p>
              <p className="text-on-surface-variant text-sm mt-1">O&apos;zbekiston Respublikasi</p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-outline-variant/30 text-center">
          <p className="text-xs text-on-surface-variant/50">
            © {new Date().getFullYear()} Barcha huquqlar himoyalangan.
            Xizmatlar &laquo;ZO&apos;R PLAY&raquo; MCHJ tomonidan ko&apos;rsatiladi.
          </p>
        </div>

      </div>
    </div>
  );
}
