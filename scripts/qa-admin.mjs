/* eslint-disable */
// Manual QA: exercises the /admin/* auth wall, list, edit page rendering,
// and server-action submission against a running dev server.
// Run with: node --env-file=.env.local --import tsx scripts/qa-admin.mjs

import { SignJWT } from "jose";

const BASE = process.env.NOC_BASE_URL || "http://localhost:3000";

const jar = new Map();

function applySetCookies(res) {
  const setCookieList = res.headers.getSetCookie?.() || [];
  for (const sc of setCookieList) {
    const [pair] = sc.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === "" || /max-age=0/i.test(sc)) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader() {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function go(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  const ck = cookieHeader();
  if (ck) headers.Cookie = ck;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });
  applySetCookies(res);
  return res;
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok  -", msg);
}

async function findActionId(html) {
  // Next.js renders a hidden input named $ACTION_ID_<hex>; that is the id
  // to send as Next-Action and also as a hidden form field.
  const m = html.match(/\$ACTION_ID_([0-9a-f]+)/i);
  return m ? m[1] : null;
}

async function main() {
  // Step 1: unauth admin pages redirect to login
  {
    const res = await go("/admin/places");
    assert(res.status === 307, "unauth /admin/places redirects (307)");
    assert(
      (res.headers.get("location") || "").startsWith("/admin/login"),
      "unauth redirect target is /admin/login",
    );
  }

  // Step 2: login page is open
  {
    const res = await go("/admin/login");
    assert(res.status === 200, "/admin/login renders 200");
  }

  // Step 3: log in via the POST /api/admin/login route handler.
  // Submit with the wrong password first
  {
    const body = new URLSearchParams({
      password: "wrong-password",
      next: "/admin/places",
    });
    const res = await go("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    assert(
      res.status === 303,
      `wrong-password POST redirects (status=${res.status})`,
    );
    const loc = res.headers.get("location") || "";
    assert(
      /\/admin\/login\?error=1/.test(loc),
      `wrong-password redirect goes to /admin/login?error=1 (got: ${loc})`,
    );
    assert(!jar.has("admin_session"), "no session cookie set on bad password");
  }

  // Submit with the correct password
  {
    const body = new URLSearchParams({
      password: process.env.ADMIN_PASSWORD || "",
      next: "/admin/places",
    });
    const res = await go("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    assert(res.status === 303, `good-password POST redirects (status=${res.status})`);
    const loc = res.headers.get("location") || "";
    assert(/\/admin\/places/.test(loc), `redirect goes to /admin/places (got: ${loc})`);
    assert(jar.has("admin_session"), "admin_session cookie set after good password");
  }

  // Step 4: now /admin/places renders the list
  {
    const res = await go("/admin/places");
    assert(res.status === 200, "authenticated /admin/places renders 200");
    const html = await res.text();
    assert(/Místa/.test(html), "list page header rendered");
    assert(/admin\/places\/\d+/.test(html), "list contains edit links");
  }

  // Step 5: /admin/places/new renders
  {
    const res = await go("/admin/places/new");
    assert(res.status === 200, "/admin/places/new renders 200");
    const html = await res.text();
    assert(/name="name"/.test(html), "form has name input");
    assert(/name="lat"/.test(html), "form has lat input");
    assert(/name="categories"/.test(html), "form has categories checkboxes");
  }

  // Step 6: pick an existing place id and verify edit page
  const listForId = await go("/admin/places");
  const listHtml = await listForId.text();
  const placeId = Number(listHtml.match(/\/admin\/places\/(\d+)/)?.[1]);
  assert(Number.isFinite(placeId), `discovered an existing place id (${placeId})`);
  {
    const res = await go(`/admin/places/${placeId}`);
    assert(res.status === 200, `edit page /admin/places/${placeId} renders 200`);
    const html = await res.text();
    assert(/Upravit:/.test(html), "edit page shows 'Upravit:' header");
    assert(/name="lat" value="/.test(html), "edit form populated with lat value");
  }

  // Step 7: CREATE via POST /api/admin/places
  const newSlug = `qa-test-${Date.now()}`;
  const newName = `QA Test Place ${Date.now()}`;
  let createdId = null;
  {
    const body = new URLSearchParams();
    body.set("name", newName);
    body.set("slug", newSlug);
    body.set("description", "Test from qa-admin script.");
    body.set("city", "QA City");
    body.set("region", "QA Region");
    body.set("lat", "50.1234");
    body.set("lng", "14.5678");
    body.set("elevationM", "");
    body.set("sleeps", "5");
    body.set("surface", "drevena");
    body.set("source", "manual");
    body.set("sourceUrl", "");
    body.set("hasWc", "on");
    body.set("isFree", "on");
    body.append("categories", "utulna");
    body.set("images", "https://example.com/photo.jpg | hero shot");
    const res = await go("/api/admin/places", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    assert(res.status === 303, `create POST redirects (status=${res.status})`);
    const loc = res.headers.get("location") || "";
    const m = loc.match(/\/admin\/places\/(\d+)\?saved=1/);
    assert(Boolean(m), `create redirect goes to edit page (got: ${loc})`);
    createdId = Number(m[1]);
    assert(Number.isFinite(createdId) && createdId > 0, `created place id is valid (${createdId})`);
  }

  // Step 8: verify created place renders on edit page
  {
    const res = await go(`/admin/places/${createdId}`);
    assert(res.status === 200, `created edit page renders 200`);
    const html = await res.text();
    assert(html.includes(newName), `edit page shows created name`);
    assert(html.includes(newSlug), `edit page shows created slug`);
    assert(html.includes("50.1234"), `edit page shows created lat`);
  }

  // Step 9: verify created place renders publicly
  {
    const res = await fetch(`${BASE}/misto/${newSlug}`, { redirect: "manual" });
    assert(res.status === 200, `public /misto/${newSlug} renders 200`);
    const html = await res.text();
    assert(html.includes(newName), `public page shows created name`);
  }

  // Step 10: UPDATE via POST /api/admin/places/[id]
  const updatedName = `${newName} (edited)`;
  {
    const body = new URLSearchParams();
    body.set("name", updatedName);
    body.set("slug", newSlug);
    body.set("description", "Updated description.");
    body.set("city", "QA City");
    body.set("region", "QA Region");
    body.set("lat", "50.9999");
    body.set("lng", "14.5678");
    body.set("sleeps", "10");
    body.set("surface", "kamenna");
    body.set("source", "manual");
    body.set("sourceUrl", "");
    body.set("isFree", "on");
    body.set("images", "");
    const res = await go(`/api/admin/places/${createdId}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    assert(res.status === 303, `update POST redirects (status=${res.status})`);
    const loc = res.headers.get("location") || "";
    assert(/\?saved=1/.test(loc), `update redirect carries saved=1 (got: ${loc})`);
  }

  // Step 11: verify update persisted
  {
    const res = await go(`/admin/places/${createdId}`);
    assert(res.status === 200, `edit page after update renders 200`);
    const html = await res.text();
    assert(html.includes(updatedName), `edit page shows updated name`);
    assert(html.includes("50.9999"), `edit page shows updated lat`);
  }

  // Step 12: DELETE via POST /api/admin/places/[id]/delete
  {
    const res = await go(`/api/admin/places/${createdId}/delete`, {
      method: "POST",
    });
    assert(res.status === 303, `delete POST redirects (status=${res.status})`);
    const loc = res.headers.get("location") || "";
    assert(/\/admin\/places\?deleted=1/.test(loc), `delete redirect to list (got: ${loc})`);
  }

  // Step 13: confirm deletion — public page now 404 and edit page 404
  {
    const res = await fetch(`${BASE}/misto/${newSlug}`, { redirect: "manual" });
    assert(res.status === 404, `public /misto/${newSlug} is 404 after delete`);
  }
  {
    const res = await go(`/admin/places/${createdId}`);
    assert(res.status === 404, `edit page is 404 after delete`);
  }

  // Step 14: cookie wall still enforced when we drop the cookie
  jar.delete("admin_session");
  {
    const res = await go("/admin/places");
    assert(res.status === 307, "after deleting cookie, /admin/places redirects again");
  }

  console.log("\nAll QA assertions passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
