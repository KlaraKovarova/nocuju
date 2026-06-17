# Runbook — uptime monitoring (UptimeRobot)

Goal: someone (the CEO) gets an email within ~5 minutes if `nocuju.cz` goes
down. Free tier is fine for v1; we revisit when traffic justifies paid.

This is a board task — only the CEO has the Hostinger email and the
UptimeRobot account. Agents document the setup; they don't sign up for
external services.

## What to monitor

Two HTTP(s) monitors on a 5-minute interval:

| Name                | URL                              | Type      | Down condition                |
| ------------------- | -------------------------------- | --------- | ----------------------------- |
| `nocuju.cz — home`  | `https://nocuju.cz/`             | HTTP(s)   | Non-2xx, timeout, or DNS fail |
| `nocuju.cz — api/health` | `https://nocuju.cz/api/health` | Keyword | Body does **not** contain `"db":"reachable"` |

The keyword monitor on `/api/health` is the important one — it catches the
"app is up but the DB is down" case which a plain HTTP check misses.

## One-time setup (CEO, ~10 minutes)

1. Go to `uptimerobot.com` → **Sign up** with the CEO mailbox.
2. *My Settings → Alert Contacts* → confirm the email contact (it sends a
   verification email). Keep the default "Send notifications when down" and
   add "Send notifications when up".
3. **Create monitor #1** — *+ Add New Monitor*:
   - Monitor type: `HTTP(s)`
   - Friendly name: `nocuju.cz — home`
   - URL: `https://nocuju.cz/`
   - Monitoring interval: `5 minutes`
   - Alert contacts: tick the CEO email
   - Save.
4. **Create monitor #2** — *+ Add New Monitor*:
   - Monitor type: `Keyword`
   - Keyword type: `not exists` (alert when keyword is missing)
   - Keyword: `"db":"reachable"`
   - URL: `https://nocuju.cz/api/health`
   - Monitoring interval: `5 minutes`
   - Alert contacts: tick the CEO email
   - Save.
5. Wait ~5 minutes; both monitors should flip to green.

## Verify the alert path works (don't skip)

The whole point is that the alert email actually arrives. Two ways to test
without a real outage:

**Option A — break the monitor URL on purpose.**

1. In UptimeRobot, edit the home monitor.
2. Temporarily change the URL to `https://nocuju.cz/this-route-does-not-exist`
   (returns 404).
3. Save and wait one cycle (≤ 5 minutes).
4. Confirm the "Monitor is DOWN" email arrives.
5. Edit it back to `https://nocuju.cz/` and confirm the "Monitor is UP"
   recovery email arrives.

**Option B — stop the Node app briefly (only out of business hours).**

1. hPanel → *Advanced → Node.js* → app `nocuju.cz` → **Stop**.
2. Wait for the down alert.
3. **Start** the app again. Wait for the up alert.
4. Visit `/api/health` to confirm green.

Either is fine. Do Option A on launch-morning prep; Option B is for a quieter
maintenance window.

## When an alert fires

Open the [500-incident runbook](./500-incident.md) and follow steps 1 → 2 →
3 → 5 in order. UptimeRobot will email a recovery as soon as the next
5-minute poll succeeds.

## Limits to be aware of (free tier)

- 50 monitors max. We use 2. Plenty of room.
- 5-minute minimum interval. Good enough; users will not notice a sub-five-min
  blip before us.
- Email alerts only. SMS / Slack / webhook require paid tier — revisit when
  we have on-call rotation.

## Account ownership

- UptimeRobot account owner: CEO (board credential).
- Monitor list / alert routing changes: CEO via the dashboard. Agents propose
  changes via issue comments.
- If we move off UptimeRobot (e.g. to BetterStack or a paid tier), update
  this doc in the same PR.
