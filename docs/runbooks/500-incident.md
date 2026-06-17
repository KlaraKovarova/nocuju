# Runbook — what to do when nocuju.cz returns 500

Scope: production site `https://nocuju.cz` hosted on Hostinger Business (see
[deploy doc](../deploy/hostinger-business.md)). This runbook covers the
"site is returning 500s / health is red" case. Severity decisions are the
CEO's; this doc is the recipe.

## 0. Signal

Either:

- UptimeRobot email to the CEO (subject `Monitor is DOWN: nocuju.cz/api/health`),
  or
- A user/team member reports the site is broken, or
- `curl -fsS https://nocuju.cz/api/health` returns non-200 or `db: unreachable`.

If the health endpoint is **green** but a single page errors, this is not a
site-wide 500 — skip to step 4 (single-route triage).

## 1. Confirm in 60 seconds

```bash
curl -i https://nocuju.cz/                      # marketing/home — should be 200
curl -i https://nocuju.cz/api/health            # should be 200 with db: reachable
curl -i https://nocuju.cz/objevit               # should be 200
```

Expected health body:

```json
{ "ok": true, "db": "reachable" }
```

If you see `503` with `db: unreachable`, the app is up but DB is down — jump to
**3. DB-down playbook**.

If you see **5xx** on `/` and `/api/health`, the Node.js app process is
unhealthy — continue.

## 2. App-down playbook (5xx on everything)

1. Open hPanel → *Advanced → Node.js* → app `nocuju.cz`.
2. Check **status**:
   - If **Stopped**, click **Start** and retry the curls. Done if green.
   - If **Running**, open *Application logs* (rolling tail in the same panel).
3. In *Application logs*, look at the last 5–10 minutes. Common patterns:
   - `ReferenceError`, `TypeError`, or a stack trace pointing at an `app/...`
     file → the latest deploy is broken. Roll back (step 5).
   - `ECONNREFUSED` / `ETIMEDOUT` to MySQL → jump to **3. DB-down playbook**.
   - `EADDRINUSE` on `$PORT` → click **Restart** in hPanel. Hostinger sometimes
     fails to release the port after a force-restart.
   - `OOMKilled` / `JavaScript heap out of memory` → restart, then file a ticket
     to investigate; this is rare on our footprint.
4. If logs are empty (`No logs to display`):
   - Click **Restart**.
   - If still empty after a restart, the process likely never bound to the
     port. Confirm *Start command* is `npm run start -- -H 0.0.0.0 -p $PORT`
     (per the deploy doc). A wrong start command is the most common cause.

## 3. DB-down playbook (`db: unreachable`)

1. hPanel → *Databases → MySQL Databases* → confirm the production DB shows
   **Active**. If it's missing or suspended, escalate to CEO immediately —
   only the board can re-activate.
2. From hPanel → *Advanced → phpMyAdmin*, open the DB and run:
   ```sql
   SELECT 1;
   SHOW TABLES;
   ```
   - If `SELECT 1` fails, MySQL is genuinely down. Escalate.
   - If tables are missing, a recent migration was applied to the wrong DB.
     Escalate and **do not redeploy**.
3. If the DB is reachable from phpMyAdmin but `/api/health` is still
   `unreachable`, the app is misconfigured:
   - hPanel → *Node.js app → Environment variables*. Confirm `DATABASE_URL`
     host/port/user/db are all correct, and `DATABASE_SSL=true`.
   - **Restart** the app after any env change (Hostinger reloads env only on
     restart).

## 4. Single-route triage (one page is broken, rest is fine)

1. Reproduce in an incognito window with no admin cookie.
2. Note the route. Check *Application logs* for the stack at the same minute.
3. If the broken route hits `places` data (e.g. `/misto/<slug>`), check
   /admin/places for the slug — a malformed row (missing lat/lng, broken
   markdown in description) commonly triggers a render error.
4. Hotfix by editing the offending row in /admin/places, then re-test.
5. If it's a code bug, file an issue and ship the fix; no need to roll back
   the whole site for a single dead route.

## 5. Rollback (last-resort, app-wide)

Per the deploy doc:

1. hPanel → *Git → Deployments* → previous green commit → **Redeploy**.
2. Wait for the build to complete (~2 min on Business).
3. Re-run the smoke from step 1.
4. **Do not redeploy past a schema migration.** If the broken commit pushed
   new DB columns/tables (check `drizzle/`), ship a forward fix instead.

## 6. After the incident

- Post a short note on the source issue (or a fresh `incident:` issue if there
  is no obvious owner) with: timeline, root cause, fix, and the link to the
  log line that nailed it.
- If UptimeRobot was the signal, confirm the recovery email arrived too. If it
  didn't, the monitor's *Down alert contacts* may need re-saving.
- If the same failure mode hits twice in a week, file a "harden against X"
  follow-up — don't keep firefighting the same edge.

## Who to ping

- App / deploy / DB schema: founding engineer agent (this repo).
- Hostinger plan, DNS, paid services, MySQL credentials, UptimeRobot account:
  CEO. Agents never hold those.
- UptimeRobot down-alert lands in the CEO's inbox; they decide whether to
  escalate.
