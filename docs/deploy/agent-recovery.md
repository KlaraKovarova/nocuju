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
  `diagnose` | `db-bootstrap` | `db-schema-push`
- `lines`: integer (used by `tail-logs`, default `200`)
- `target_sha`: full SHA (used by `rollback`)

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
actions instead share a single body that:

1. Maintains a sibling source checkout at `$HOME/.noc-src` (clones the public
   GitHub repo on first run, fetches+checks out the target ref on subsequent
   runs). `pull-and-restart` targets `origin/main`; `rollback` targets the
   explicit `target_sha`.
2. Runs `NODE_ENV=production npm ci && npm run build` in `$HOME/.noc-src`. The
   postbuild step patches `.next/standalone/server.js` for Phusion Passenger
   (NOC-64). `BUILD_COMMIT_SHA` is exported so `/api/health/version` reports
   the SHA we just deployed.
3. Takes a hardlinked snapshot of `APP_PATH` at
   `$HOME/.noc-snapshots/pre-<action>-<ts>/` (cheap; last 5 retained) for
   forensic recovery.
4. Rsyncs the standalone tree into `APP_PATH` with `--delete`, excluding
   runtime files we must preserve (`tmp/`, `*.log`, `nodejs/`, `.env*`,
   `.noc-deploy-sha`, and `.next/static/` which is synced separately). Then
   rsyncs `.next/static/` and `public/` separately with `--delete`.
5. Writes `$APP_PATH/.noc-deploy-sha` so `verify-deploy` can report what was
   last deployed (we have no `.git` to inspect on the box).
6. `touch tmp/restart.txt` — same restart channel Hostinger uses for its
   own deploys.

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

## 5. Out of scope (handled elsewhere)

- The current NOC-53 incident — board action required there separately.
- Re-landing the migration verifier from NOC-52 — separate ticket once the box
  is healthy.
- Centralised hosted logging (Datadog / Logtail / Better Stack). When traffic
  warrants persistent log retention beyond the latest tail, file a new ticket.
- VPS migration. Out of scope until we outgrow Business's per-app process cap.
