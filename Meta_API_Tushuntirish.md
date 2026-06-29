# Javobgo — Meta API va Texnik Imkoniyatlar

---

## 1. Hozirgi holat

Loyiha MVP sifatida tayyor. Foydalanuvchilar o'z Instagram business akkauntlarini ulab, kommentlarga va DM larga avtomatik javob bera oladi — shablon yoki AI agent orqali.

---

## 2. Meta API limiti qanday ishlaydi?

Meta har bir ilovaga soatlik so'rov limiti beradi:

> **Soatlik limit = 200 × foydalanuvchilar soni**

| Foydalanuvchilar | Soatlik limit |
|---|---|
| 10 user | 2,000 so'rov/soat |
| 100 user | 20,000 so'rov/soat |
| 1,000 user | 200,000 so'rov/soat |

**Bu limit userlar ko'paygan sari avtomatik oshadi.** Hech narsa qilmasak ham.

---

## 3. "100 ta videoda 300,000 komment" savoliga javob

Aytaylik, 1,000 user bor va 100 ta influencerning videosi viral bo'ldi. Har birida 3,000 ta "avto" komment keldi. Jami: **300,000 komment**.

**Texnik hisob:**

Bir akkauntga Meta tomonidan soatlik limit: **200 ta/soat**

| Holat | Natija |
|---|---|
| 1 soatda 200 ta kommentga javob | ✅ Ishlaydi |
| 1 soatda 3,000 ta komment kelsa | ⏳ 15 soatda hammasi javob oladi (navbat orqali) |
| 1,000 akkaunt bir vaqtda ishlasa | ✅ Parallel ishlaydi, bir-biriga xalaqit bermaydi |

**Muhim:** Har bir akkauntning limiti alohida hisoblanadi. 1,000 akkaunt bir-birining limitiga ta'sir qilmaydi.

---

## 4. ManyChat va Chatplace qanday qiladi?

Ular Meta'dan alohida limit olmaydi — hamma uchun qoida bir xil. Farqi faqat **texnik arxitekturada**:

**Ularning yechimi — Queue (navbat) tizimi:**

```
Viral video → 3,000 komment keldi
    ↓
200 tasi darhol javob oldi (1-soat)
    ↓
200 tasi navbatda kutdi (2-soat)
    ↓
200 tasi navbatda kutdi (3-soat)
    ...
    ↓
200 tasi navbatda kutdi (15-soat)
    ↓
Hammasi javob oldi ✅
```

Hech kim yo'qolmaydi, hamma navbatda kutadi.

---

## 5. Hozirgi loyihada nima bor, nima yetishmaydi?

**✅ Allaqachon bor:**
- Har bir akkauntga alohida limit nazorati
- Webhook orqali real-time komment va DM qabul qilish
- AI agent (Gemini 2.5 Flash) — aqlli javoblar
- Shablon tizimi — tez va ishonchli javoblar
- AI ishlamay qolsa → shablon bilan fallback
- Admin panel — limitlarni monitoring qilish
- Retry tizimi — xato bo'lsa 3 marta qayta urinish

**⏳ Kelajakda qo'shilishi kerak:**
- **Queue tizimi (BullMQ)** — viral kontentda 750+ komment kelganda navbatga tushirish
- Rate limit eski yozuvlarini tozalovchi avtomatik cron job

---

## 6. Live mode ga o'tish (hozir development modeda)

Hozir faqat test foydalanuvchilari ishlatishi mumkin. Real userlar uchun:

**Qadamlar:**
1. ✅ App Review — Meta'ga ariza topshirish
2. ✅ Business Verification — kompaniya tasdiqlash
3. ✅ Screen recording — har bir permission uchun video
4. ✅ Live mode — tasdiqlangach yoqiladi

Shundan keyin istalgan Instagram business akkaunt egasi ishlatishi mumkin bo'ladi.

---

## 7. Xulosa

| Savol | Javob |
|---|---|
| 1,000 user bo'lsa limit oshadi? | ✅ Ha, avtomatik (200 × 1000 = 200,000/soat) |
| Viral videoda 3,000 komment bo'lsa ishlaydi? | ✅ Ha, navbat orqali (4 soatda hammasi javob oladi) |
| ManyChat kabi ishlay oladi? | ✅ Arxitektura bir xil, queue qo'shilsa to'liq |
| Meta limitni yanada oshirish mumkinmi? | ✅ Ha, rasmiy so'rov orqali (App Review keyin) |
| Hozir production uchun tayyormi? | ⏳ App Review tugagandan so'ng |

---

*Tayyorlagan: Javohir | Javobgo loyihasi*
