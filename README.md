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

# 4. push schema (no migrations yet — schema is a placeholder)
npm run db:push

# 5. dev server
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
    schema.ts          # tables land here (NOC-3)
tests/                 # Vitest
drizzle.config.ts
```
