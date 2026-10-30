# unishare → uniauth, revision 2: central login + OAuth session per app

Supersedes the shared-cookie design in `planning.md` (phase 4 as built on `feat/uniauth`).

Status: **implemented on `feat/uniauth` and verified locally (2026-09-28); not merged.**

## Verified locally (uniauth :3002, unishare API :3001, DB `unishare_uniauth`)

- Silent check signed out → `login_required` → `/auth/return` → back to the page as a guest.
- Silent check signed in at uniauth → code → unishare session, linked to the existing user
  (same id, role kept); KMUTT member mapped from the organizations claim; a brand-new uniauth
  user gets a new local user.
- Rename at uniauth → shows in unishare at the next sign-in.
- Sign-out → unishare and uniauth sessions both end, no confirmation page (id_token_hint).
- MCP: uniauth token for a user whose local id differs from their uniauth id → resolved via
  the account row, tools listed.
- Ban (unishare admin plugin) → sign-in refused (`BANNED_USER` explained on /login); unban
  restores it.
- Legacy mode: sign-up, profile edits, own MCP discovery unchanged; uniauth routes absent.

Not verified end to end: **back-channel logout** — uniauth only accepts https
`backchannel_logout_uri`s, so the local client has none; the endpoint is covered by unit tests
with signed logout tokens. The web pages were not viewed in a browser (component tests only).

## Found while building

- **Cookie name collision:** apps run Better Auth too (`better-auth.session_token`), and
  unishare's cookie is on the parent domain in production, so uniauth now uses the `uniauth`
  prefix.
- **genericOAuth (1.6) error routing:** provider errors skip the sign-in's
  `errorCallbackURL`; `onAPIError.errorURL` points at the web's `/auth/return` instead.
- **Local clients:** web OAuth clients must use https redirect URIs, so local development
  registers a native client (`create-client.ts --local`).
- **Existing users need their `account` row before cutover:** without it, a password user
  whose uniauth email is unverified gets `account_not_linked` instead of being attached to
  their unishare account (the safe default — linking on an unverified email would let anyone
  claim an account). The phase 5 import must create these rows.
- **Phase 5 ordering:** run the import (users, accounts, `account` link rows) **before**
  production uniauth accepts public sign-ups. Otherwise someone can register an existing
  unishare user's email on uniauth first, and the import collides with that account.
- **Silent check scope:** at most once per 10 minutes per browser (cookie, all tabs), skipped
  for crawlers; protected deep links go through `/login?next=` so the check returns there.
- **Pre-existing:** unishare's own session cookie is still set on `.psstee.dev` in production
  (`crossSubDomainCookies`). Serving Better Auth from the web origin would make it host-only.

## Why the change

The shared-cookie design sends the uniauth session cookie to every `*.psstee.dev` host —
including third-party presenton (`decks`), argocd, grafana and user-uploaded content on
`s3.psstee.dev`. Any of those servers receives every user's session on every request, and a
subdomain serving uploaded HTML can plant cookies. Revision 2 keeps the central login pages
(one place users type passwords) and gives each app its **own** session, obtained through
OAuth 2.1 / OIDC from uniauth — the standard SSO shape (Google, Microsoft, Auth0).

## How it works

```
share.psstee.dev (unishare)            auth.psstee.dev (uniauth)
───────────────────────────            ─────────────────────────
no local session
  └─ redirect ── /oauth2/authorize ──▶ signed in here?
                 (prompt=none first)     ├─ yes → code, instantly (no page shown)
                                         └─ no  → login_required → unishare shows guest view;
                                                  "Sign in" → uniauth /login (central page)
◀── /api/auth/oauth2/callback/uniauth ─ code
exchange code → id_token (sub, email, name, picture, organizations)
create/link local User, set unishare's OWN session cookie (host-only)
```

- **Instant sign-in:** on a first visit without a local session, the web app makes one silent
  `prompt=none` round-trip (~200–500 ms). Signed in at uniauth → signed in to unishare with
  no page shown. Not signed in → `login_required` comes back and the visitor stays a guest; the
  attempt is remembered for the browser session so it isn't retried on every page.
- **Cookies:** uniauth's cookie is host-only on `auth.psstee.dev` (`COOKIE_DOMAIN` unset).
  unishare's stays on its own host. No cookie is shared across subdomains.
- **Trusted clients:** unishare and unigym are confidential OAuth clients registered with
  `skip_consent`. MCP clients keep dynamic registration + consent (phase 3, unchanged).

## What unishare keeps

unishare keeps Better Auth **as its session layer**, switched from "identity provider" to
"OIDC client":

- `genericOAuth` provider `uniauth` (discovery URL, client id/secret, PKCE).
- Email/password and the Google/Microsoft providers are **turned off** in uniauth mode:
  passwords and social logins live only in uniauth.
- Sessions, `@Session()` / `@Roles()`, the global guard, both socket gateways, `proxy.ts` and
  the `admin` plugin (roles, bans — they revoke unishare sessions) work exactly as today.
- Guests stay **local to unishare** (its `anonymous` plugin), as in the original decision.
- MCP (phase 3) stays: tokens verified against uniauth's JWKS.

## Identity mapping

Better Auth drops the provider's `id` when it creates a user from an OAuth sign-in, so the link
is the `account` row it writes: `providerId = 'uniauth'`, `accountId = <uniauth user id>`.

- **Existing users:** the phase 5 import copies them to uniauth with the **same id** and
  inserts that `account` row in unishare, so they land on their existing profile.
- **New users:** a new local id, linked by the `account` row.
- **MCP:** the verifier resolves `sub` → local user through the same row (today it assumes
  `sub` is the local id).
- **Universities:** uniauth adds `organizations: [{ id, slug, verified }]` to the ID token and
  userinfo; unishare maps it through `University.slug` on sign-in (US-12).

## Account actions move to uniauth

Password change, set-password, linked Google/Microsoft accounts and "delete my account"
become a small **account page on uniauth** (`auth.psstee.dev/account`), shared by every app.
unishare's profile page links there for security settings and keeps what is unishare's
(bio, department, E2EE keys, "delete my unishare data").

## Sign-out

- **Sign out** in unishare: end the unishare session, then uniauth's own `/logout` page, which
  ends the uniauth session and returns to unishare. (Not the OIDC end-session endpoint: without a
  usable `id_token_hint` it shows Better Auth's unstyled confirmation page.)
- **Other apps:** uniauth's **back-channel logout** notifies each client's
  `backchannel_logout_uri`; unishare gets a small endpoint that verifies the logout token and
  revokes that user's unishare sessions. Without it, other apps stay signed in until their own
  session expires.

## Changes

### uniauth

| File                                   | Change                                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/auth/auth.ts`         | `organizations` in ID token/userinfo (`customIdTokenClaims` / `customUserInfoClaims`); drop `customSession`; host-only cookie by default |
| `apps/server/scripts/create-client.ts` | **new**: register a trusted app (confidential, `skip_consent`, back-channel URI) with an admin session                                   |
| `apps/web/src/pages/account.tsx`       | **new**: change/set password, linked accounts, sign out everywhere, delete account                                                       |
| `apps/web/src/pages/login.tsx`         | "already signed in" shortcut only for non-OAuth visits (OAuth continues via the signed query)                                            |
| `packages/sdk`                         | unchanged and unused by unishare (published 0.1.0 stays)                                                                                 |

### unishare — reverted from `feat/uniauth` (shared-cookie design)

`UniauthGuard`, `AuthSessionService` / `AuthSessionModule` (and its body parsers), the SDK
dependency, the gateway + collab refactor, the admin routes in the users module, the web
admin/danger-zone/sign-out/proxy changes, and `auth-mode.ts` in its current form.

The branch is local and unpushed, so it is rebuilt from `9633ee31` (MCP verifier +
`uniauthOrgId`), keeping the old tip as tag `archive/uniauth-shared-cookie`.

### unishare — new

| File                                                         | Change                                                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/auth/auth.config.ts`                           | uniauth mode: `genericOAuth` provider, email/password + social off, account linking to `uniauth` by the `account` row        |
| `apps/api/src/auth/uniauth-sign-in.ts`                       | **new**: map ID token → local user (name/email/image first time, university from `organizations`, `consentGivenAt`)          |
| `apps/api/src/modules/auth/backchannel-logout.controller.ts` | **new**: verify logout token (uniauth JWKS), revoke the user's sessions                                                      |
| `apps/api/src/modules/mcp/mcp-token.verifier.ts`             | `sub` → local user via `account` row                                                                                         |
| `apps/web/src/lib/auth/client.ts`                            | `genericOAuthClient`                                                                                                         |
| `apps/web/app/(auth)/login/page.tsx`                         | uniauth mode: "Continue" → `signIn.oauth2({ providerId: 'uniauth' })`; guest link stays                                      |
| `apps/web/components/silent-sign-in.tsx`                     | **new**: one `prompt=none` attempt per browser session when signed out                                                       |
| profile / sign-out components                                | security settings link to uniauth `/account`; sign-out → local + end-session                                                 |
| env                                                          | `AUTH_MODE`, `UNIAUTH_ISSUER`, `UNIAUTH_CLIENT_ID`, `UNIAUTH_CLIENT_SECRET` (API); `NEXT_PUBLIC_AUTH_MODE` (web, build-time) |

No controller changes. No schema change beyond `University.slug` (US-12; it replaced `uniauthOrgId`).

## Steps

1. Rebuild the branch from `9633ee31`; archive tag for the old tip. ~10m
2. uniauth: organizations claim, host-only cookie, `create-client` script. ~1h
3. uniauth: `/account` page. ~3h
4. unishare API: `genericOAuth` in uniauth mode, sign-in mapping, MCP `sub` lookup, specs. ~3h
5. unishare API: back-channel logout endpoint + spec. ~1.5h
6. unishare web: login, silent sign-in, sign-out, profile links. ~2h
7. Local end-to-end in both modes: password, guest, silent SSO across two clients, logout
   propagation, ban, MCP. ~2h

Total: about 1½–2 days (less than the shared-cookie phase 4, because unishare's session layer
stays).

## Trade-offs

- **One redirect** on first visit instead of none. Invisible to users (no page renders).
- **Logout across apps** depends on back-channel delivery; if unishare is down when a user signs
  out elsewhere, its session lives until expiry (7 days) — same as any OIDC SSO.
- **Profile edits:** name and avatar are **always synced from uniauth** (`overrideUserInfo`)
  on every sign-in, and edited only on uniauth's `/account` page. unishare's profile form keeps
  bio/department and links to uniauth for name/avatar; its API ignores name/image in uniauth
  mode. An edit in uniauth shows in unishare at that app's next sign-in.

## Decisions

1. Name/avatar: always synced from uniauth (edited on uniauth `/account`).
2. Silent `prompt=none` sign-in on the first visit of a browser session.
3. `feat/uniauth` rebuilt from `9633ee31`; old tip kept as tag `archive/uniauth-shared-cookie`.
