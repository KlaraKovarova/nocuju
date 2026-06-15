# Deploy: Hostinger Business (Cloud hosting) — Node.js app

This is the runbook for shipping NOC to **Hostinger Business / Cloud hosting** with the
**Node.js app** feature enabled. It assumes the board has already bought the plan
and owns the hPanel credentials — agents never see those.

Source-of-truth flow:

```
GitHub (main)  ──hPanel Git auto-pull──▶  Hostinger Node.js app  ──proxied──▶  public domain
                                                  │
                                                  └── reads MySQL on the same Hostinger plan
```

Continuous deploy uses **hPanel's built-in Git integration**, not an SSH/FTP
GitHub Action. Rationale: Business tier ships with hPanel Git that pulls on
webhook from GitHub, runs the configured build/start commands, and restarts the
Node.js app. No SSH keys, no repo secrets in GitHub, no surface for an agent to
leak credentials. If we ever outgrow it (multi-env, custom build steps), we can
swap to the SSH-based workflow described at the bottom.

---

## 0. One-time provisioning checklist (board)

The board does this once, before the first deploy. Agents do not run these steps.

- [ ] **Plan**: Hostinger **Business** (Cloud Startup is fine too) with **Node.js app** support enabled.
- [ ] **Domain**: a `.cz` domain connected to the plan (or a Hostinger subdomain
      for staging).
- [ ] **MySQL database** created in hPanel → *Databases → MySQL Databases*:
  - DB name, user, password — captured in a password manager, **never** pasted
    into GitHub, agent chat, or this repo.
  - Note the **host** hPanel shows (usually `mysql.hostinger.com` or a per-plan
    hostname) and the **port** (usually `3306`).
- [ ] **Node.js app** created in hPanel → *Advanced → Node.js*:
  - **Node version**: 20.x LTS (matches local dev; Next.js 16 requires ≥ 18.18).
  - **Application root**: `/domains/<domain>/public_html` (or whatever hPanel proposes — note it down).
  - **Application URL**: the production domain.
  - **Application startup file**: leave as default; we override start command below.
- [ ] **Environment variables** (hPanel → Node.js app → *Environment variables*):
  - `DATABASE_URL=mysql://<user>:<password>@<host>:3306/<db>`
  - `DATABASE_SSL=true` (Hostinger MySQL exposes TLS on the public network)
  - `NODE_ENV=production`
  - `PORT` — Hostinger injects this automatically; do **not** override.
- [ ] **GitHub repo connection** in hPanel → *Advanced → Git*:
  - Repository URL: `https://github.com/<org>/noc.git`
  - Branch: `main`
  - Install path: same as the Node.js app's *Application root*.
  - Enable **Auto Deployment** so a push to `main` triggers a pull.
  - hPanel will show a webhook URL; paste it into GitHub →
    *Repo settings → Webhooks → Add webhook* with content type
    `application/json` and event `push`.

---

## 1. Build & start commands (in hPanel Node.js app)

Configure these once in the Node.js app screen (the runbook does not change them
between deploys):

| Field           | Value                                       |
| --------------- | ------------------------------------------- |
| Node version    | `20.x`                                      |
| Package manager | `npm`                                       |
| Install command | `npm ci`                                    |
| Build command   | `npm run build`                             |
| Start command   | `npm run start -- -H 0.0.0.0 -p $PORT`      |

Notes:

- `npm ci` (not `npm install`) — deterministic, fails if `package-lock.json` is
  stale, matches CI.
- Next.js's default `next start` binds to `0.0.0.0` on `$PORT` automatically; the
  explicit flags are there so a future Next change can't silently bind to
  `localhost` and break the reverse proxy.
- Do **not** add a `prebuild` step that talks to the DB. Hostinger's build phase
  runs without the live env in some plans; only the runtime has `DATABASE_URL`.
- **`NODE_ENV=production` is set on the Node.js app, so `npm ci` skips
  `devDependencies`.** Anything `next build` touches at compile time — currently
  `@tailwindcss/postcss` and `tailwindcss` — must live under `dependencies` in
  `package.json`, not `devDependencies`. CI happens to install everything (no
  `NODE_ENV` set), so a missing prod-deps placement won't show up there. Verify
  by running `NODE_ENV=production npm ci && npm run build` locally before
  promoting a new build-time tool.

---

## 2. Deploy flow (per push to `main`)

1. Developer merges a PR into `main` on GitHub.
2. GitHub fires the webhook → hPanel pulls the latest `main`.
3. hPanel runs `npm ci && npm run build` in the application root.
4. hPanel restarts the Node.js app (stop → start with the new build).
5. Reverse proxy continues routing the public domain to the new process.

You can also trigger a deploy manually from hPanel → *Git → Pull from GitHub*
(useful when re-running after fixing a misconfig that ate a webhook).

---

## 3. Smoke check — required after every deploy

```bash
curl -fsS https://<production-domain>/api/health
```

Expected response (HTTP 200):

```json
{ "ok": true, "db": "reachable" }
```

If `db` is `"unreachable"` or you get a 503: open hPanel → Node.js app →
*Application logs*. The most common causes are:

- `DATABASE_URL` typo, wrong host, or missing TLS (`DATABASE_SSL` not `"true"`).
- MySQL user not granted on the right DB (re-grant from *MySQL Databases*).
- Hostinger MySQL has a per-user connection cap; if we're saturating it, lower
  `connectionLimit` further in `src/db/client.ts` or move heavy traffic off the
  health route.

If `/api/health` itself 404s, the build didn't ship — confirm in *Git → Last
deployment* that the latest commit hash matches GitHub `main`.

---

## 4. Hostinger Business limits we expect to hit

Documented here so a future ticket can budget around them — none of these are
blockers for the MVP.

| Limit                   | Practical value on Business                          | What we do today                     |
| ----------------------- | ---------------------------------------------------- | ------------------------------------ |
| Long-lived Node procs   | 1 app, ~1–2 worker processes                         | Single `next start` process; fine.   |
| RAM                     | ~1.5 GB (varies by tier)                             | Next.js prod build sits well under.  |
| Disk                    | 200 GB shared with mail/static                       | Repo + `.next` build ≪ 1 GB.         |
| Inbound ports           | Only the platform-assigned `PORT`; reverse-proxied   | We bind `$PORT`, that's all we need. |
| Outbound ports          | 80/443 to anywhere; SMTP via Hostinger only          | Email work will need a 3rd-party.    |
| WebSockets              | Supported through the Node reverse proxy             | Not used yet; verify before relying. |
| Cron / background jobs  | hPanel cron only, no in-process schedulers across restarts | Use hPanel cron when we need one.    |
| SSH                     | Available on Business; we don't depend on it for CI/CD | Reserved for one-off ops.            |
| MySQL connection cap    | ~25 concurrent per user (Hostinger default)          | Pool is set to `connectionLimit: 1`. |

If we ever need to run a second long-lived process (queue worker, scheduled
sync), we'll hit the per-app process cap before we hit RAM. Escalate to the CEO
and switch to **VPS** at that point — don't try to multiplex inside one Node
app.

---

## 5. Rollback

hPanel → *Git → Deployments* keeps a history. Pick the previous good commit and
click **Redeploy**. There is no separate "Hostinger build cache" to clear; the
redeploy re-runs `npm ci && npm run build` against the older tree.

If MySQL schema has moved forward of the code we're rolling back to, do **not**
redeploy — instead, ship a forward-fix. Drizzle migrations live under
`drizzle/` and we don't have a tested down-migration story yet.

---

## 6. CI on GitHub (separate from deploy)

`.github/workflows/ci.yml` runs on every PR and every push to `main`. It does
**not** deploy — Hostinger's webhook does that. CI's job is to fail loud before
Hostinger pulls a broken `main`:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

If CI is red on `main`, disable hPanel auto-deploy from the *Git* panel until
the fix lands. Hostinger will happily pull a broken build and restart into a
crash loop otherwise.

---

## 7. Fallback: SSH/FTP-based GitHub Actions deploy

We are intentionally **not** using this today. Document it here so a future
agent doesn't have to re-discover it if hPanel Git integration breaks or we
need per-env deploys.

Minimal sketch:

```yaml
# .github/workflows/deploy.yml — NOT enabled today.
name: Deploy to Hostinger (SSH)
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - name: rsync to Hostinger
        uses: burnett01/rsync-deployments@7.0.1
        with:
          switches: -avzr --delete --exclude=node_modules --exclude=.next/cache
          path: ./
          remote_path: ${{ secrets.HOSTINGER_APP_PATH }}
          remote_host: ${{ secrets.HOSTINGER_HOST }}
          remote_user: ${{ secrets.HOSTINGER_USER }}
          remote_key:  ${{ secrets.HOSTINGER_SSH_KEY }}
      - name: restart Node.js app via SSH
        run: |
          ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_HOST \
            "cd $HOSTINGER_APP_PATH && npm ci --omit=dev && touch tmp/restart.txt"
```

If we go this route, the board mints a dedicated SSH key for CI (not a personal
key), stores it in **GitHub repo → Settings → Secrets and variables → Actions**
as `HOSTINGER_SSH_KEY`, and authorises it in hPanel → *Advanced → SSH Access*.
Agents still never see the key value — only the secret name.

---

## Quick links

- Health endpoint: `src/app/api/health/route.ts`
- DB client (pool + TLS toggle): `src/db/client.ts`
- Env template: `.env.example`
- CI workflow: `.github/workflows/ci.yml`
