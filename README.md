# Bily Card v2

Clean, server-first implementation for a digital gaming top-up platform.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- Secure cookie-based auth

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/bily-card-v2
AUTH_SECRET=replace_with_very_long_random_secret_32_chars_min
DAILY_CARD_BASE_URL=https://api.dailycard.example
DAILY_CARD_API_KEY=your_daily_card_key
```

3. Seed data:

```bash
npm run seed
```

4. Run dev server:

```bash
npm run dev
```

## Default Admin

- Email: `admin@bilycard.com`
- Password: `Admin@12345`

## Architecture Doc

See `docs/ARCHITECTURE.md`.

