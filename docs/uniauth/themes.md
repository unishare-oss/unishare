# Shared themes

UniShare consumes `@unishare-oss/unitheme@0.2.0` from GitHub Packages for palettes,
metadata, the React provider and picker. Feed style, font size and chat sound remain local
UniShare settings. Theme IDs and CSS variable names are unchanged.

Signed-in users sync through `/api/uniauth/theme` (GET/POST). The Nest backend resolves
the user's linked OIDC account, refreshes its provider token with Better Auth and exchanges
it for the preference at UniAuth. OAuth tokens/client secrets never enter the browser.
Cookie-authenticated writes require the frontend Origin. Guests stay browser-local.

The root layout server-renders the last displayed theme from the validated host-only
`unicorp-theme` cookie and passes it as `initialTheme` to the shared provider. There is
no theme-bootstrap script. The provider mirrors selections and account-sync results to
this display-only cookie (SameSite=Lax, Secure on HTTPS); it never authenticates anyone.
Account preferences remain authoritative and load asynchronously. Without a valid cookie,
the server uses the default and legacy guest localStorage migrates on the first mount.
Cookie reads make the root layout request-rendered; do not publicly cache personalized HTML.

## Installation and rollout

- Supply `NODE_AUTH_TOKEN` with private package `read:packages` access for local installs.
- Grant this repo Actions access to the GitHub package, or set `GH_PACKAGES_TOKEN` for CI.
  Docker uses a BuildKit `npm_token` secret; credentials are not copied into image layers.
- Deploy UniAuth's `user_preferences` migration and endpoints before this app version.
- The account theme is authoritative. A new account with no preference uses the default;
  select a theme once to save it across apps. The legacy `theme` key is retained for guests.
- Sync runs on mount/focus and every minute while visible. A save failure preserves the
  local preview and shows Retry; it does not pretend the account was updated.

All new UniCorp apps should use OIDC for identity and the shared package for theme UI.
The old authentication SDK is not a dependency of this application.
