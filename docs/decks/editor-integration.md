# Deck editing: embedding the generator's editor

## Why

The form-based slide editor this replaced **did not work**, and failed silently.

A slide has two representations in the generator. `content` is the semantic object the model
writes (`large_title_area.slide_headline`). `ui` is an absolutely-positioned render tree —
1280×720, per-element geometry, fonts and `runs` — and `ui` is what both the generator's own
frontend and the PowerPoint exporter read. Critically, **`ui` is stored, not derived from
`content`**.

Our `updateSlide` sent only `content`. Verified against a duplicated deck:

```
content-only slide_update   ->  200 OK, export contains the edit: False
content + ui.runs           ->  200 OK, export contains the edit: True
```

A student edited a heading, chose "Update preview", and downloaded the original deck. No error
anywhere.

Rather than fix the write path and keep a text-box form, editing moves to the generator's own
editor — a Konva canvas with drag/resize, undo/redo, rich text, 13 element types, AI slide edit
and image search. Porting it would mean vendoring ~4,100 lines plus a subtree of LaTeX, chart
and SVG dependencies into an app that uses TanStack Query rather than its Redux. Framing it
costs no fork, and **deletes more code than it adds**.

## What made it safe

Three facts, each verified against the running instance rather than assumed:

**The generator is multi-tenant.** A non-admin account's `presentation/all` returns `count: 0`
and any other user's deck id returns `404`. Ownership isolation is enforced server-side; we do
not build it.

**It is framable.** No `X-Frame-Options`, no CSP `frame-ancestors`.

**Traefik can inject the session.** `forwardAuth`'s `authResponseHeaders` deletes a listed
header from the client request and replaces it with the auth server's value. Listing `Cookie`
lets Unishare attach the student's generator session upstream, so the browser never holds a
generator cookie and the generator's login page is unreachable.

## How it fits together

```
browser (iframe on decks-dev.psstee.dev)
  -> Traefik Ingress                              k8s-practice/presenton/ingress.yaml
     -> Middleware deck-editor-auth-dev           k8s-practice/presenton/middleware.yaml
          -> GET /api/decks/frame-auth            decks.controller.ts
               Better Auth session or 401
               route policy                       decks.frame-auth.service.ts
               session brokering                  presenton/presenton-accounts.service.ts
               200 + `Cookie: presenton_session=...`
     -> svc/presenton:80
```

`/_next/static` and `/static/icons` have their own Ingress with no middleware: a single editor
page is dozens of requests. `/app_data` is deliberately **not** exempt — exports live there.

### Accounts

`PresentonAccountsService` gives each Unishare user their own generator account, created on
first use through an admin session (`admin/users` rejects the API key with _"Admin browser
session required"_). Passwords are **derived, never stored**:
`HMAC(PRESENTON_ACCOUNT_SECRET, userId)`. No credential table, no encryption key.

Sessions are cached in Redis for 30 minutes and treated as possibly-stale: callers re-login on
a 401 rather than validating up front, which would add a round trip to every request.

The trade-off — rotating `PRESENTON_ACCOUNT_SECRET` orphans every account — and its recovery
path are documented in `k8s-practice/presenton/README.md`.

### Generation now runs as the owner

`PresentonClient` previously authenticated every call with one admin API key, so **every deck
was owned by the admin account**. Left alone, students would open the editor to an empty
dashboard. `generate`, `reexport` and `deletePresentation` all take an owner and act as them;
only `listTemplates` still uses the API key, because templates are instance-wide.

### Route policy

The editor's own buttons can call the model and create decks, neither of which passes through
BullMQ, `DECK_CONCURRENCY` or the daily allowance. `decks.frame-auth.service.ts` is the only
thing preventing that, so it is tested directly:

- **Blocked** — the generator's admin routes, its auth routes, and every creation route
  (`presentation/generate`, `create`, `create/blank`, `prepare`, `derive`, `{id}/duplicate`).
  A deck created there would have no `Deck` row: absent from the library, uncounted by the
  quota, never cleaned up on delete. **Creation belongs to Unishare.**
- **Metered** — `slide/edit`, `slide/edit-html`, `presentation/edit`, `images/generate`,
  `chat`, `theme/generate`, `template/layouts/generate`. Counted against
  `AI_EDIT_DAILY_CAP` over the same rolling window as the deck quota.
- Paths are normalised before matching. `URL` resolves `..` but does **not** collapse repeated
  slashes, while nginx in front of the generator does — so `/api/v1//admin/users` would have
  passed the check here and been served upstream. A test covers it.

Metering fails **closed**, unlike `CronLockService`'s fail-open: with the counter unreadable
there is no way to know whether the cap is spent, and an unmetered model endpoint is worse than
a briefly unavailable AI button. Only metered routes are affected; the rest of the editor works
without Redis.

## Deleted

`slide-editor.tsx`, `lib/decks/content-fields.ts`, `DeckSlideEntity`, the slide DTOs,
`getSlides`/`updateSlide`/`aiEditSlide` on the controller, service and port, and their tests.
The write-path bug went with the code that had it.

## Known limits

- **The generator's own chrome is visible in the frame.** Cross-origin means no DOM access, so
  its nav and dashboard links cannot be hidden from the parent. Its API 403s a non-admin and
  the route policy blocks the admin paths, so this is cosmetic — but it is another product's
  navigation inside ours. Accepted deliberately when theming was dropped in favour of
  functionality.
- **Edits are invisible to Unishare.** We cannot know when a student changed something, so the
  deck page states unconditionally that downloads rebuild on "Update downloads" rather than
  showing a stale-render banner that would sometimes be wrong.
- **The editor depends on the API being up.** forwardAuth sits in front of every frame request,
  where previously only generation needed the API.
- **Decks generated before this change are admin-owned** and will not appear in any student's
  editor. Their downloads still work; there is no ownership-transfer API.
