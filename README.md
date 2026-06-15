# NOC — overnight stays

Next.js (App Router) + TypeScript + Tailwind + Drizzle + MySQL.
Source of truth lives on GitHub; production target is Hostinger.

## Local setup

Prereqs: Node 20+, a local MySQL 8 (or MariaDB 10.6+) instance.

```bash
# 1. install deps
npm install

# 2. configure env
cp .env.example .env.local
# edit DATABASE_URL to point at your local MySQL

# 3. create the dev database (one-time)
mysql -uroot -e "create database noc_dev;"

# 4. push schema to an empty DB
npm run db:push

# 5. seed ~20 places (idempotent, safe to re-run)
npm run seed

# 6. dev server
npm run dev
```

Health check: `GET http://localhost:3000/api/health` → `{ "ok": true, "db": "reachable" }`.

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Next.js dev server                    |
| `npm run build`    | Production build                      |
| `npm run start`    | Run the production build              |
| `npm run lint`     | ESLint                                |
| `npm run typecheck`| `tsc --noEmit`                        |
| `npm run test`     | Vitest                                |
| `npm run db:push`  | Apply schema directly (dev only)      |
| `npm run db:generate` | Generate SQL migrations            |
| `npm run seed`     | Insert/update ~20 Czech utulny + placeholder photos |

## Environment variables

See `.env.example`. The two we care about today:

- `DATABASE_URL` — `mysql://user:pass@host:port/db`
- `DATABASE_SSL` — set to `true` when the MySQL host requires TLS (most managed providers, including Hostinger over the public network)

## Deployment — GitHub → Hostinger

Target: **Hostinger Business / Cloud hosting** with the **Node.js app** feature.
Continuous deploy is wired through hPanel's GitHub integration (auto-pull on
push to `main`); GitHub Actions runs CI but does not push to Hostinger.

Full runbook (provisioning checklist, env vars, build/start commands, smoke
check, limits, rollback): [`docs/deploy/hostinger-business.md`](./docs/deploy/hostinger-business.md).

## Project layout

```
src/
  app/                 # Next.js App Router
    api/health/route.ts
  db/
    client.ts          # Drizzle + mysql2 pool
    schema.ts          # domain tables
tests/                 # Vitest
drizzle.config.ts
```

## Data model

The product is a directory of **free Czech mountain shelters** (utulny / nouzová
nocoviště), not paid accommodations — so there are no `price_per_night_czk` or
`contact_email/phone` fields. Instead each place carries `is_free` (always true
for now), `sleeps` (capacity), `surface`, and `has_wc`. Region lives on
`locations`, not its own table — every place rolls up through `location_id`.

```
places                 ── locations (city, region, country)
  ├─ place_categories ── categories  (utulna, nouzove-nocoviste)
  ├─ place_amenities  ── amenities   (wc, voda, oheniste, stul, kamna)
  └─ place_images     (url, alt, sort_order)
```

Source of truth: [`src/db/schema.ts`](./src/db/schema.ts).
Seed: [`scripts/seed.ts`](./scripts/seed.ts) — ~20 entries across 10+ kraje,
each with 2 placeholder photos from `picsum.photos`.
