# Launch-day smoke checklist

Run this in a fresh incognito window on the morning of the launch, before the
CEO publishes the announcement. Takes ~3 minutes. If anything fails, postpone
the announcement and open the [500 runbook](./500-incident.md).

## Pre-flight (terminal)

- [ ] `curl -fsS https://nocuju.cz/api/health` returns
      `{"ok":true,"db":"reachable"}`.
- [ ] `curl -I https://nocuju.cz/sitemap.xml` returns `200` with
      `Content-Type: application/xml`.
- [ ] `curl -I https://nocuju.cz/robots.txt` returns `200`.
- [ ] UptimeRobot dashboard shows both monitors **green**.

## Browser smoke (incognito, mobile + desktop viewport)

Hit each route, confirm it renders without a console error and the data looks
sane.

- [ ] **Home** `https://nocuju.cz/` — hero, intro, top regions, CTA to `/objevit`.
- [ ] **Browse** `https://nocuju.cz/objevit` — list shows places with names,
      regions, surface/sleep stats. Click a region in the dropdown and confirm
      the list filters.
- [ ] **Search** `https://nocuju.cz/objevit` — type `Krkonoše` (or any region
      name) into the search box; list narrows within a debounce.
- [ ] **Map** `https://nocuju.cz/mapa` — Leaflet tiles load, pins are visible
      on the Czech Republic. Click a pin → popup opens with the place name and
      a link to its detail page.
- [ ] **Place detail** `https://nocuju.cz/misto/<any-slug-from-the-list>` —
      title, description, coordinates, amenities, surface, sleeps. The
      "Nahlásit problém" CTA is visible.
- [ ] **Region page** `https://nocuju.cz/oblast/krkonose` (or whichever region
      we lead with) — h1, intro, place list, structured data in `<head>`
      (`view-source:` and ⌘F `JSON-LD`).
- [ ] **Saves** click ☆ on a place card on `/objevit` → toast says it's saved.
      Reload the page → the star stays filled. Visit
      `https://nocuju.cz/moje-mista` → the saved place shows up.
- [ ] **Report flow** on a place page click "Nahlásit problém" → choose a
      category → leave a short note → submit → success state. Confirm in
      `/admin/reports` (Otevřené tab) that the report appears.
- [ ] **OG / share** open `https://nocuju.cz/` in
      [opengraph.xyz](https://www.opengraph.xyz/) (or any OG previewer) and
      confirm the title, description, and OG image render.

## Admin

- [ ] `https://nocuju.cz/admin` redirects to `/admin/login`.
- [ ] Log in with the admin password from the CEO's vault.
- [ ] `/admin/places` shows the full list, with a working "Nové místo" form.
- [ ] `/admin/reports` loads (may be empty pre-launch, that is fine).
- [ ] `/admin/analytics` loads. After ~5 minutes of warm-up traffic the
      "Posledních 7 dní" stat is ≥ 1 pageview.
- [ ] Click **Odhlásit** → confirms the admin session ends and redirects to
      `/admin/login`.

## If anything is red

- A single page is broken → step 4 of the [500 runbook](./500-incident.md).
  Decide whether the announcement can still go out without that page.
- Anything site-wide → **postpone the announcement** until green. The launch
  post is more painful to retract than to delay by an hour.
- DB-level oddity (missing tables, schema drift) → escalate to CEO, do **not**
  redeploy. The forward-fix path is safer than rolling backward across a
  schema change.

## After "go" (first 24 hours)

- [ ] Check `/admin/analytics` every few hours — total sessions should climb,
      mobile share should be > 0.
- [ ] Check `/admin/reports` for user-submitted issues; resolve or triage
      anything that lands.
- [ ] Watch the CEO inbox for the first UptimeRobot alert (or a recovery if
      we had a brief blip). The first real one is signal; the first fake one
      is something to debug.
