# Agent-driven Hostinger recovery

When the production Node app on Hostinger goes sideways, an agent must be able
to **see what's happening** and **push a fix** without waiting for a human to
log into hPanel. This document is the design and runbook for that path.

It exists because NOC-53 stalled the public site for hours: the agent had no
way to read application logs, confirm which commit hPanel was actually serving,
or restart the app. All three required board hands-on hPanel action.

---

## 1. What Hostinger gives us

Investigation summary (NOC-54):

| Channel | Available on Business plan? | Suitable for agent use? |
| --- | --- | --- |
| Hostinger public API (`developers.hostinger.com`) | Only covers **VPS** (`/api/vps/v1/*`). No endpoints for the managed Node app on shared/Business plans. | No — wrong product line. |
| hPanel UI buttons (logs, pull, restart) | Yes | No — agents have no hPanel session. |
| SSH | **Yes**, can be enabled in hPanel → *Advanced → SSH Access*. | **Yes** — this is the path. |
| Webhook from Hostinger after deploy | Not exposed; we only fire one *into* Hostinger from GitHub. | No. |
| In-process endpoints (`/api/health/*`) on the app itself | Yes, but **only when the app is up**. | Useful for verification, not recovery. |

**Decision: SSH-over-GitHub-Actions is the recovery channel.**

- The board enables SSH on the Hostinger plan once, mints a dedicated CI key,
  and stores three secrets in this repo (see §3). The private key never leaves
  GitHub.
- Agents never see the key. They call a `workflow_dispatch` workflow with
  inputs like `action=tail-logs` or `action=pull-and-restart`; GitHub Actions
  loads the key, opens the SSH tunnel, runs the command, and the agent reads
  the result from the workflow log via `gh run view --log`.
- This sidesteps the "agent needs a credential and must not leak it" problem:
  the credential lives in GitHub, the agent only has permission to *trigger*
  the workflow, and every recovery action is auditable in the Actions log.

Hybrid pieces that don't need SSH and ship today:

- `/api/health/version` — the running app reports its own commit SHA, so the
  agent can detect drift between `git push` and what's deployed without SSH.
- `/api/health/schema` — the running app validates expected tables exist, so
  post-migration outages are caught before the smoke probe times out.
- Post-deploy gate workflow on push to `main` — polls those endpoints, runs
  route probes, and triggers `action=rollback` automatically if anything fails
  within a window after the deploy.

We do **not** add a separate hosted log shipper. The Node app on Hostinger
Business writes `stderr.log` and `stdout.log` to the app root; SSH + `tail` is
enough until traffic justifies the cost of Datadog/Logtail.

Plan/cost implications: **none.** Business already includes SSH and Node app
support. We do not need to upgrade to VPS to land this work. If the day comes
where we want process supervisors, queue workers, or our own log retention,
that's a separate VPS migration ticket.

---

## 2. Architecture

```
┌────────────────────┐   workflow_dispatch    ┌──────────────────────┐
│  Agent (heartbeat) │ ─────────────────────▶ │ GitHub Actions       │
│  `gh workflow run` │                        │  recover.yml         │
└────────────────────┘                        │  - loads SSH key     │
       ▲                                      │  - runs remote cmd   │
       │   `gh run view --log`                │  - prints to log     │
       │                                      └──────────┬───────────┘
       │                                                 │ SSH
       │                                                 ▼
       │                                      ┌──────────────────────┐
       │                                      │ Hostinger Node app   │
       │                                      │  ~/domains/.../      │
       │                                      │   public_html        │
       │                                      │   nodejs/{stdout,    │
       │                                      │           stderr}.log│
       │                                      └──────────────────────┘
       │
       │   HTTPS GET                           ┌──────────────────────┐
       └────────────────────────────────────── │ /api/health/*        │
                                               │ (in-process)         │
                                               └──────────────────────┘
```

### 2.1 In-app endpoints (live now)

All under `src/app/api/health/`. No auth — they expose only the data we are
happy to make public (commit SHA is already public via the GitHub repo;
schema-shape booleans don't leak data).

| Route | Returns |
| --- | --- |
| `GET /api/health` | DB reachability + describing error if not. (existing) |
| `GET /api/health/version` | Build-time commit SHA, build timestamp, runtime uptime, Node version. Lets the agent detect deploy drift. |
| `GET /api/health/schema` | For each expected table: `{ exists: boolean, rowCountSample: number }`. Lets the agent confirm a migration landed without opening hPanel. |

The version endpoint reads `BUILD_COMMIT_SHA` baked at build time. Hostinger's
build phase runs in the repo's git working tree, so we resolve the SHA from
`git rev-parse HEAD` during `next build` via the `next.config.ts` env wiring.
If that resolution fails (older deploys, ad-hoc rebuilds), the endpoint reports
`commit: "unknown"` — explicit, not silent.

### 2.2 Recovery workflow (`.github/workflows/recover.yml`)

`workflow_dispatch` inputs:

- `action`: `tail-logs` | `verify-deploy` | `pull-and-restart` | `rollback` |
  `diagnose` | `db-bootstrap` | `db-schema-push` | `db-audit-places` |
  `db-cleanup-seed-places` | `db-migrate-verification` | `provision-admin-env` |
  `reap-workers`
- `lines`: integer (used by `tail-logs`, default `200`)
- `target_sha`: full SHA (used by `rollback`)
- `pids`: space-separated PIDs (used by `reap-workers`, optional)

`provision-admin-env` (NOC-102) merges `ADMIN_SESSION_SECRET` (generated on
the box, never leaves it) and `ADMIN_PASSWORD` (from the optional repo secret
`ADMIN_PASSWORD`, shipped over SSH stdin) into the durable master env file
`$HOME/.noc-env`, installs it as `APP_PATH/.env`, restarts the app via
`tmp/restart.txt`, and probes `/api/admin/login`. Without the repo secret it
writes a random placeholder password so the endpoint stops 500ing — to make
admin login actually work, the board sets the `ADMIN_PASSWORD` repo secret
(GitHub → Settings → Secrets and variables → Actions, or
`gh secret set ADMIN_PASSWORD`) and reruns the action. The workflow then
verifies a real login end-to-end without printing the value.

**Env durability:** `APP_PATH/.env` proved to be wiped across deploys
(NOC-102) even though the deploy rsync excludes it, so the source of truth is
`$HOME/.noc-env` (outside `APP_PATH`). Both `provision-admin-env` and every
`pull-and-restart`/`rollback` copy it back to `APP_PATH/.env` before touching
`tmp/restart.txt`. Never write secrets only to `APP_PATH/.env` — put them in
the master file (or rerun `provision-admin-env`, which migrates any keys it
finds in `APP_PATH/.env` into the master).

The job loads `HOSTINGER_SSH_HOST`, `HOSTINGER_SSH_USER`, `HOSTINGER_SSH_KEY`,
`HOSTINGER_APP_PATH` from repo secrets, opens an SSH connection, runs the
action's remote command, and prints output to the workflow log. Trigger from
an agent heartbeat with:

```bash
gh workflow run recover.yml -f action=tail-logs -f lines=500
# wait for run id, then:
gh run view <id> --log
```

If the secrets are missing the workflow fails fast with a single-line message
telling the operator which secret is unset. That's our signal that the board
hasn't completed the one-time setup yet.

#### How `pull-and-restart` and `rollback` work on Hostinger Business (NOC-65)

Hostinger's *Node.js → Pull from GitHub* drops only the built artifacts into
`APP_PATH` (`server.js`, `.next/`, `node_modules/`, `package.json`, `public/`)
— **never `.git/`**. So neither action can `git fetch` from `APP_PATH`. Both
actions share four steps that build on the GitHub Actions runner and ship the
result over SSH:

1. **Resolve target ref.** `pull-and-restart` targets `main`; `rollback`
   targets the explicit `target_sha`. The job-level `actions/checkout@v4`
   checks out exactly that ref.
2. **Build on the CI runner.** `actions/setup-node@v4` with `node-version: '22'`
   matches the runtime, then `npm ci && npm run build` produces the standalone
   tree at `.next/standalone/` plus `.next/static/` and `public/`. The
   postbuild step patches `.next/standalone/server.js` for Phusion Passenger
   (NOC-64). `BUILD_COMMIT_SHA` is exported so `/api/health/version` reports
   the SHA we just deployed.

   *Why not build on Hostinger?* The CloudLinux user cgroup caps `nproc` low
   enough in a regular SSH shell that `next build` (Turbopack OR webpack)
   fails at worker spawn with `ERR_WORKER_INIT_FAILED` / `EAGAIN`. hPanel's
   internal deploy worker runs with a relaxed cgroup so its own pulls build
   fine, but agents can't reach that channel. The CI runner has the resources
   Next needs and produces a portable Linux/x64 standalone tree.
3. **Snapshot and rsync.** A short SSH session takes a hardlinked snapshot of
   `APP_PATH` at `$HOME/.noc-snapshots/pre-<action>-<ts>/` (cheap; last 5
   retained) for forensic recovery. Then three rsync-over-SSH calls ship:
   - `.next/standalone/` → `APP_PATH/` with `--delete` (excludes
     `tmp/`, `*.log`, `nodejs/`, `.env*`, `.noc-deploy-sha`,
     `.next/static/`, `public/` so we don't blow away runtime files or the
     trees synced below)
   - `.next/static/` → `APP_PATH/.next/static/` with `--delete`
   - `public/` → `APP_PATH/public/` with `--delete`
4. **Mark + restart.** A final SSH session writes `$APP_PATH/.noc-deploy-sha`
   (so `verify-deploy` can report what was last deployed without a `.git`),
   then `touch tmp/restart.txt` — the same restart channel Hostinger uses for
   its own deploys.

This sidesteps Hostinger's webhook-based pull mechanism entirely while still
producing the exact layout that the platform's Node app expects.

### 2.3 Post-deploy gate (`.github/workflows/post-deploy-gate.yml`)

Fires on `push` to `main`. After a 30s settle window (so hPanel has time to
pull and restart), it:

1. Polls `/api/health/version` for up to 5 minutes until `commit` matches the
   SHA that triggered the workflow. If it never matches, that's the "deploy
   drift" alarm.
2. Runs probes for `/api/health`, `/api/health/schema`, `/`, and one
   representative route. Each probe must return 200 within 5 s.
3. If any probe fails, calls `recover.yml` with `action=rollback` and
   `target_sha=<previous-good-sha>` (the run records the previous good SHA in
   a workflow artifact between runs).

A failing gate is the canonical signal: the next heartbeat the agent reads
sees a red workflow run, knows the rollback already ran, and can investigate
in `tail-logs` mode.

### 2.4 Agent CLI wrapper (`scripts/probe.ts`)

Thin TypeScript CLI so an agent doesn't have to remember the SSH/gh
incantations. Subcommands:

- `probe` — runs the same probes the post-deploy gate uses, but from a local
  checkout. Useful when investigating without burning a workflow run.
- `verify` — fetches `/api/health/version`, compares against `git rev-parse
  origin/main`, prints `IN_SYNC` / `DRIFT`.
- `tail` — `gh workflow run recover.yml -f action=tail-logs` + waits for the
  run + prints the captured logs.
- `redeploy` — same wrapper for `action=pull-and-restart`.
- `rollback <sha>` — same wrapper for `action=rollback`.

---

## 3. One-time setup (board)

Until this is done, recovery still requires hPanel. The board does this once.

1. **Enable SSH** in hPanel → *Advanced → SSH Access*. Copy the SSH command
   shown (it contains `<user>@<host> -p <port>`).
2. **Mint a CI SSH key** on the board's laptop:
   ```bash
   ssh-keygen -t ed25519 -C "noc-recovery@github" -f ~/.ssh/noc-recovery
   ```
   Add the **public** key (`noc-recovery.pub`) to hPanel → *SSH Access → Manage
   SSH keys*. Test once: `ssh -i ~/.ssh/noc-recovery <user>@<host> 'pwd'`.
3. **Add four secrets** to GitHub → *Repo settings → Secrets and variables →
   Actions → New repository secret*:
   - `HOSTINGER_SSH_HOST` — the host from step 1 (e.g. `145.x.y.z`). Just the
     hostname — no `user@`, no `:port`, no scheme.
   - `HOSTINGER_SSH_USER` — the user from step 1 (e.g. `u123456789`).
   - `HOSTINGER_SSH_KEY` — paste the **private** key (the file without `.pub`).
   - `HOSTINGER_APP_PATH` — the Node app's *Application root* shown in hPanel
     → *Node.js* (e.g. `/home/u123456789/domains/nocuju.cz/public_html`).
4. **Delete the private key** from the board laptop after pasting (only the
   public copy remains, on Hostinger). The secret in GitHub is now the only
   live copy.

**SSH port**: the workflow auto-detects the port — it tries the optional
override secret `HOSTINGER_SSH_PORT` first, then `65002` (Hostinger Business /
Premium shared standard), then `22` (VPS / custom setups). You only need to set
`HOSTINGER_SSH_PORT` if your hPanel SSH line shows something other than 22 or
65002.

Verification from any laptop:

```bash
gh workflow run recover.yml -f action=verify-deploy
gh run watch
```

Expected output: prints the SHA the Hostinger box has checked out, matching
the latest `main`.

---

## 4. Runbook — "site is 503, what do I run?"

The agent's heartbeat runbook. Each step is a single command.

1. **Confirm the symptom.** `curl -fsS https://www.nocuju.cz/api/health`
   - HTTP 503 with `db: unreachable` → DB or env-var issue. Skip to step 3.
   - HTTP 5xx with no body / connection refused → the Node app is down. Step 2.
   - HTTP 200 → site is up; reassess what made you think it was down.
2. **Pull recent logs.**
   ```bash
   gh workflow run recover.yml -f action=tail-logs -f lines=500
   gh run watch
   ```
   Read the captured `stderr.log` / `console.log` tail in the workflow output.
3. **Verify deployed commit.**
   ```bash
   npm run probe -- verify
   ```
   - `IN_SYNC` → it's not a deploy drift.
   - `DRIFT` → hPanel hasn't pulled `main`, or our last recover deploy is
     stale. Run step 4.
4. **Force a pull + restart** (build origin/main into `APP_PATH` via the
   sibling source checkout at `$HOME/.noc-src` — see §2.2 for the mechanism).
   ```bash
   gh workflow run recover.yml -f action=pull-and-restart
   gh run watch
   ```
   After it completes, re-run `/api/health` and `verify`.
5. **If the latest commit is the broken one, roll back to a previous SHA.**
   ```bash
   gh workflow run recover.yml -f action=rollback -f target_sha=<previous-good-sha>
   gh run watch
   ```
   The rollback rebuilds `<previous-good-sha>` from source on the Hostinger
   box, rsyncs the standalone tree into `APP_PATH`, and signals restart. It
   leaves a hardlinked snapshot of the prior state at
   `$HOME/.noc-snapshots/pre-rollback-<ts>/` (last 5 retained) for forensic
   recovery if the rebuild itself goes sideways.

   *Caveat*: if Hostinger's auto-deploy is still enabled, the next push to
   `main` will pull and rebuild on top of your rollback. Either land a
   forward-fix immediately or pause auto-deploy in hPanel → *Git*.

   Then file a follow-up ticket explaining the breakage and what to ship next.
6. **If neither pull-and-restart nor rollback recovers the box**, the
   build/sync step itself may have wedged `APP_PATH`. Read
   `$HOME/.noc-snapshots/pre-<action>-<ts>/` via `tail-logs`-style SSH to
   inspect the prior good state, and escalate to the CEO with a specific
   request (e.g. manual hPanel *Git → Pull from GitHub* button push, or a
   board-side `rsync` from the snapshot back to `APP_PATH`).

---

## 5. Second deploy channel: Hostinger's native GitHub webhook

The SSH workflow in §2 is the **primary** recovery channel — built, tested, in
agent hands. It also bypasses Hostinger's webhook entirely (we build on the CI
runner and rsync the standalone tree), so a flaky webhook never blocks recovery.

In parallel, we keep Hostinger's native *pull-from-GitHub* webhook live as a
**second channel**:

- It is the only channel that re-uses Hostinger's own build worker (relaxed
  cgroup → `next build` works without our CI runner). Useful if CI is degraded.
- It runs without any GitHub Actions concurrency, so if Actions itself is
  blocked (SSH outage to Hostinger, a CI secret rotated, a deploy gate stuck
  in queue), the board can still ship by clicking *Git → Pull from GitHub* in
  hPanel and the platform's own deploy worker handles it.
- A board member without `gh` / repo-secret access can also trigger a deploy
  from hPanel.

This channel exists if and only if a GitHub → repo → *Webhooks* entry posts
`push` events to Hostinger's hPanel-issued URL. Verify with:

```bash
gh api /repos/KlaraKovarova/nocuju/hooks
```

Look for an active hook whose `config.url` points at Hostinger and whose
`last_response.code` is `200`. If the array is empty, the channel is dead —
re-add it via the one-time setup below.

### 5.1 One-time setup (board, hPanel + GitHub UI)

The webhook URL embeds an opaque per-plan token only hPanel renders. There is
no Hostinger API for the shared/Business Git integration (see §1 table), so
this stays a credentialed human-UI step.

1. hPanel → *Advanced → Git*. If the GitHub connection is missing, recreate it
   per `docs/deploy/hostinger-business.md` §0. Toggle *Auto Deployment* on.
   hPanel will surface a **webhook URL** and a **secret**.
2. Copy both. GitHub → *Repo settings → Webhooks → Add webhook*:
   - **Payload URL**: the URL from step 1.
   - **Content type**: `application/json`.
   - **Secret**: the secret from step 1 (paste exactly; trailing whitespace
     will silently break HMAC verification on Hostinger's side).
   - **Which events?**: *Just the push event*.
   - **Active**: ✅.
3. Push a no-op commit to `main` (e.g. whitespace in this doc) and watch
   *Recent Deliveries* on the GitHub webhook page. Expect `200` within ~5 s.
4. Verify the public hook record:

   ```bash
   gh api /repos/KlaraKovarova/nocuju/hooks \
     --jq '.[] | {id, url: .config.url, code: .last_response.code, status: .last_response.status}'
   ```

   Expected: at least one entry with a Hostinger `url` and `code: 200`. The
   record is also visible at GitHub → *Settings → Webhooks → Recent Deliveries*.

If `last_response.code` is `200` but the deploy didn't land, the SSH channel in
§4 step 4 (`pull-and-restart`) is the next move — Hostinger acknowledged the
hook but its build worker failed.

---

## 6. Out of scope (handled elsewhere)

- The current NOC-53 incident — board action required there separately.
- Re-landing the migration verifier from NOC-52 — separate ticket once the box
  is healthy.
- Centralised hosted logging (Datadog / Logtail / Better Stack). When traffic
  warrants persistent log retention beyond the latest tail, file a new ticket.
- VPS migration. Out of scope until we outgrow Business's per-app process cap.
