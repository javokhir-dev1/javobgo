import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Foydalanish Shartlari — JavobGo",
  description: "JavobGo xizmatidan foydalanish shartlari va qoidalari.",
};

export default function TermsPage() {
  const lastUpdated = "2026-07-06";

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm text-primary hover:underline mb-6 inline-block">
            ← Bosh sahifaga qaytish
          </Link>
          <h1 className="text-3xl font-bold text-on-surface mb-2">Foydalanish Shartlari</h1>
          <p className="text-on-surface-variant text-sm">
            Oxirgi yangilanish: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-on-surface">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Umumiy qoidalar</h2>
            <p className="text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">JavobGo</strong> xizmatidan (&laquo;Xizmat&raquo;)
              foydalanish orqali siz ushbu Foydalanish Shartlariga rozilik bildirasiz. Xizmat{' '}
              <strong className="text-on-surface">&laquo;ZO&apos;R PLAY&raquo; MCHJ</strong>{' '}
              (O&apos;zbekiston Respublikasi) tomonidan ko&apos;rsatiladi. Agar shartlarga rozi
              bo&apos;lmasangiz, Xizmatdan foydalanmang.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">2. Xizmat tavsifi</h2>
            <p className="text-on-surface-variant leading-relaxed">
              JavobGo — Instagram biznes yoki kreator akkauntlariga kelgan shaxsiy xabarlar (DM) va
              post izohlariga shablon yoki sun&apos;iy intellekt (AI) yordamida avtomatik javob berish
              imkonini beruvchi platforma. Xizmat Meta (Instagram) API va Telegram avtorizatsiyasi
              orqali ishlaydi.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">3. Foydalanish talablari</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Xizmatdan foydalanish uchun sizda amaldagi Instagram biznes yoki kreator akkaunti va
              Telegram hisobi bo&apos;lishi kerak. Siz kamida 18 yoshda yoki o&apos;z hududingizdagi
              qonuniy voyaga yetgan bo&apos;lishingiz va ulanayotgan akkauntni boshqarishga haqli
              bo&apos;lishingiz shart.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">4. Foydalanuvchi majburiyatlari</h2>
            <p className="text-on-surface-variant leading-relaxed mb-2">
              Siz Xizmatdan faqat qonuniy maqsadlarda foydalanishga rozilik bildirasiz. Quyidagilar
              taqiqlanadi:
            </p>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant text-sm pl-2">
              <li>Spam, aldov, nafrat nutqi, noqonuniy yoki zararli kontent tarqatish</li>
              <li>Instagram/Meta qoidalari va jamoat me&apos;yorlarini buzish</li>
              <li>Xizmat tizimiga ruxsatsiz kirish yoki uni buzishga urinish</li>
              <li>Boshqa shaxslar nomidan ruxsatsiz ish yuritish</li>
            </ul>
            <p className="text-on-surface-variant text-sm mt-3">
              Avtomatik javoblar mazmuni va ular keltirib chiqaradigan oqibatlar uchun to&apos;liq
              javobgarlik foydalanuvchi zimmasida.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Meta va uchinchi tomon xizmatlari</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Xizmat Meta Platform, Instagram va Google Gemini kabi uchinchi tomon xizmatlaridan
              foydalanadi. Xizmatdan foydalanib, siz Meta Platform Terms va Instagram Community
              Guidelines shartlariga ham rioya qilishga rozisiz. Ushbu platformalarning ishlashi,
              cheklovlari yoki o&apos;zgarishlari uchun biz javobgar emasmiz.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">6. Xizmat cheklovlari</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Instagram API soatlik so&apos;rov limitlari qo&apos;yadi, shu sababli javoblar navbat
              (queue) orqali kechikishi mumkin. Biz Xizmatning uzluksiz yoki xatosiz ishlashini
              kafolatlamaymiz.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Intellektual mulk</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Xizmatning barcha dasturiy ta&apos;minoti, dizayni va brendi{' '}
              <strong className="text-on-surface">&laquo;ZO&apos;R PLAY&raquo; MCHJ</strong> ga tegishli.
              Sizning Instagram kontentingiz va ma&apos;lumotlaringiz sizga tegishli bo&apos;lib qoladi.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">8. To&apos;lov</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Xizmat hozirda bepul taqdim etiladi. Kelajakda pullik tariflar joriy etilishi mumkin —
              bu haqda oldindan xabar beriladi.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">9. Javobgarlikni cheklash</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Xizmat &laquo;boricha&raquo; (as is) asosida taqdim etiladi. Qonun ruxsat etgan darajada,{' '}
              <strong className="text-on-surface">&laquo;ZO&apos;R PLAY&raquo; MCHJ</strong> Xizmatdan
              foydalanish natijasida yuzaga kelgan bilvosita, tasodifiy yoki oqibatli zararlar
              (masalan, akkaunt bloklanishi, daromad yo&apos;qolishi, ma&apos;lumot yo&apos;qolishi)
              uchun javobgar emas.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">10. Xizmatni to&apos;xtatish</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Shartlar buzilgan taqdirda biz hisobingizni ogohlantirishsiz to&apos;xtatib qo&apos;yish
              yoki o&apos;chirish huquqini saqlab qolamiz. Siz ham istalgan vaqtda akkauntingizni
              o&apos;chirishingiz mumkin — batafsil{' '}
              <a href="/data-deletion" className="text-primary hover:underline">
                Ma&apos;lumotlarni o&apos;chirish
              </a>{' '}
              sahifasida bayon etilgan (o&apos;chirish so&apos;rovidan so&apos;ng{' '}
              <strong className="text-on-surface">90 kun</strong> ichida tiklash imkoni bor).
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">11. Maxfiylik</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Ma&apos;lumotlaringiz qanday qayta ishlanishi{' '}
              <a href="/privacy-policy" className="text-primary hover:underline">
                Maxfiylik Siyosati
              </a>
              da bayon etilgan va u ushbu shartlarning ajralmas qismidir.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">12. O&apos;zgarishlar</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Ushbu shartlar vaqti-vaqti bilan yangilanishi mumkin. Muhim o&apos;zgarishlar haqida
              xabar beriladi. Xizmatdan doimiy foydalanish yangilangan shartlarga rozilikni anglatadi.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">13. Amaldagi qonun</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Ushbu shartlar O&apos;zbekiston Respublikasi qonunlariga muvofiq tartibga solinadi.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">14. Bog&apos;lanish</h2>
            <div className="bg-surface-container rounded-lg p-4 mt-3">
              <p className="text-on-surface font-medium">&laquo;ZO&apos;R PLAY&raquo; MCHJ</p>
              <p className="text-on-surface-variant text-sm mt-1">O&apos;zbekiston Respublikasi</p>
              <p className="text-on-surface-variant text-sm mt-2">
                Email:{' '}
                <a href="mailto:koryobu@gmail.com" className="text-primary hover:underline">
                  koryobu@gmail.com
                </a>
              </p>
              <p className="text-on-surface-variant text-sm mt-1">
                Telegram bot orqali:{' '}
                <a
                  href={`${process.env.NEXT_PUBLIC_BOT_URL || 'https://t.me/javobgobot'}?start=murojaat`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono"
                >
                  /murojaat
                </a>
              </p>
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
