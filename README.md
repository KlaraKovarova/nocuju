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

The flow we're targeting:

1. **Source on GitHub.** `main` is the deployable branch. Feature work happens on PRs.
2. **Hostinger MySQL.** Provision a MySQL database in hPanel; collect host, port, user, password, db name and put them in the server's environment as `DATABASE_URL`. Set `DATABASE_SSL=true` if connecting over the public network.
3. **Hostinger Node.js app.** Deploy the Next.js app to a Hostinger plan that supports Node.js (VPS or Business/Cloud hosting with Node.js apps). Build command: `npm ci && npm run build`. Start command: `npm run start` (Next.js binds to `PORT`, which Hostinger injects).
4. **Continuous deploy.** Connect the GitHub repo via Hostinger's Git integration (or push via SSH) so merges to `main` trigger a rebuild.

### Open questions for the CEO

- **Hostinger plan choice.** Shared hosting doesn't run long-lived Node processes; we need either:
  - **Business / Cloud hosting** with the Node.js app feature (cheapest path, suitable for an MVP), or
  - **VPS** (more control, slightly more ops, easy Docker later).
  Both include MySQL. Recommendation pending board decision before provisioning — flagged on the issue, not provisioned yet.
- **Driver/ORM.** Going with `mysql2` + Drizzle to stay aligned with the existing stack decision.

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
