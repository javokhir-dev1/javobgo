# InstaBot v2.0

Instagram DM va kommentlarga avtomatik javob beruvchi bot.

**Stack:** NestJS · Next.js 14 · PostgreSQL · TypeORM · Tailwind CSS

## Struktura

```
avto_komment_bot/
├── backend/     ← NestJS + TypeORM + PostgreSQL (port 4000)
└── frontend/    ← Next.js 14 + Tailwind CSS (port 3000)
```

## Ishga tushirish

### 1. PostgreSQL database yarating
```sql
CREATE DATABASE instabot;
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# .env faylini to'ldiring

npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local

npm install
npm run dev
```

Dashboard: `http://localhost:3000`

## API Endpointlar

| Method | URL | Tavsif |
|--------|-----|--------|
| GET | `/api/instagram/status` | Instagram ulanish holati |
| GET/PATCH | `/api/settings` | Sozlamalar |
| GET/PUT | `/api/dm-messages` | DM xabarlar |
| GET | `/api/logs` | Loglar |
| GET/POST | `/webhook` | Meta webhook |

---

## Meta Developer sozlamalari

### Qadam 1: App yaratish
1. [developers.facebook.com](https://developers.facebook.com) ga kiring
2. "My Apps" → "Create App" bosing
3. "Business" turini tanlang
4. App nomini kiriting

### Qadam 2: Instagram API qo'shish
1. App Dashboard → "Add Products" → Instagram → Set Up
2. "Instagram API with Instagram Login" ni tanlang
3. Instagram Business/Creator hisobingizni ulang

### Qadam 3: Token olish
1. App Settings → Basic → App ID va App Secret ni `.env` ga ko'chiring
2. Instagram Test Users yoki Production da Access Token oling
3. Long-lived token olish uchun:
   ```
   GET https://graph.instagram.com/access_token
     ?grant_type=ig_exchange_token
     &client_id={APP_ID}
     &client_secret={APP_SECRET}
     &access_token={SHORT_LIVED_TOKEN}
   ```

### Qadam 4: Webhook sozlash
1. App Dashboard → Webhooks → Instagram
2. "Subscribe to this object" bosing
3. Callback URL: `https://your-domain.com/webhook`
4. Verify Token: `.env` dagi `WEBHOOK_VERIFY_TOKEN` qiymati
5. "comments" va "messages" fieldlarini belgilang

### Qadam 5: Server ommaviy bo'lishi kerak
Webhook ishlashi uchun serveringiz internet orqali accessible bo'lishi lozim.

**Bepul variantlar:**
- **Render.com** — bepul Node.js hosting
- **Railway.app** — oson deploy
- **Ngrok** — local test uchun: `ngrok http 3000`

---

## .env fayli

```env
INSTAGRAM_APP_ID=123456789          # Meta App ID
INSTAGRAM_APP_SECRET=abc123...       # Meta App Secret
INSTAGRAM_ACCESS_TOKEN=EAABs...      # Long-lived Access Token
INSTAGRAM_BUSINESS_ACCOUNT_ID=17... # Instagram Business Account ID
WEBHOOK_VERIFY_TOKEN=my_secret_123  # O'zingiz o'ylab topgan kalit
PORT=3000
```

---

## Shablonlar

Komment javob va DM shablonlarida quyidagi o'zgaruvchilarni ishlating:

| O'zgaruvchi | Ma'no |
|-------------|-------|
| `{name}` | Komment qoldirgan foydalanuvchi nomi |
| `{comment}` | Komment matni |

**Misol:**
- Komment javob: `Rahmat, @{name}! Sizning savolingiz uchun tashakkur 🙏`
- DM: `Salom @{name}! Kommentingizni ko'rdik, tez orada javob beramiz ✨`

---

## Muhim eslatma

Instagram DM yuborish cheklovi:
- Foydalanuvchi sizning sahifangizni follow qilgan bo'lishi **YOKI**
- So'nggi 24 soat ichida siz bilan muloqot qilgan bo'lishi kerak

Bu Instagram API ning standart cheklovi hisoblanadi.
