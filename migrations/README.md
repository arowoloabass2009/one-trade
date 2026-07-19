# ONE-TRADE — Database Setup

## Run migrations in this order in the Supabase SQL Editor

| File | What it does |
|------|-------------|
| `001_initial_schema.sql` | Creates all tables + indexes |
| `002_rls_policies.sql`   | Row-Level Security (secure v2) |
| `003_storage.sql`        | Blog image storage bucket |
| `004_rpc_functions.sql`  | Race-free view counter RPC |

### How to run

1. Go to: https://xmridruggyzxjoicsksb.supabase.co
2. Open **SQL Editor** in the left sidebar
3. Paste each file's content and click **Run** — in order

---

## Tables

| Table | Purpose |
|-------|---------|
| `blog_posts` | Blog articles (admin-only write) |
| `blog_comments` | Public comments, pending approval |
| `newsletter_subscribers` | Email subscribers |
| `contact_messages` | Contact form submissions |

---

## Admin Panel

- URL: `/admin-login.html`
- Passcode: `sham2026`
- Session expires after **8 hours**
- Passcode is validated via SHA-256 hash (never stored in plain text)

---

## Dev Server

```bash
npm run dev
# TypeScript watch + BrowserSync → http://localhost:3000
```

## Production Build

```bash
npm run build
# Compiles TypeScript → js/app.js
```

## Vercel Deployment

```bash
# Connect repo to Vercel, set:
# Build Command: npm run build
# Output Directory: .  (root)
# No environment variables needed — Supabase URL/key are in supabase.js
```
