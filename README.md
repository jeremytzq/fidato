# Fidato Labs CRM

Singapore real-estate CRM for solo agents — leads kanban, follow-up cadence, clients, transactions, P&L, Content Hub, recruitment, and Meta Lead Ads ingest.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Auth, Postgres, RLS, Storage)
- Google OAuth (optional Sheets sync)

## Setup

1. Copy env vars:

```bash
cp .env.local.example .env.local
```

2. Create a Supabase project and run SQL in the SQL Editor:

- **Greenfield:** `supabase-schema.sql`
- **Existing project** that already applied older migrations: `supabase_consolidate_migration.sql`

3. Enable Google provider in Supabase Auth (and Sheets scope if you use Database → Sheets sync).

4. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Meta Lead Ads (optional)

Set `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, and `META_STATE_SECRET` in `.env.local`. Point the Meta webhook to `/api/meta/webhook`, then connect Pages from **Settings → Meta Lead Ads**.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
```
