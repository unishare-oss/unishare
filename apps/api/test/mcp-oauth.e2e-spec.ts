import { execFileSync } from 'node:child_process'

describe('MCP OAuth flow (e2e)', () => {
  it('registers, consents, denies, exchanges, and refreshes', () => {
    const script = String.raw`
      const { betterAuth } = await import('better-auth');
      const { memoryAdapter } = await import('better-auth/adapters/memory');
      const { mcp } = await import('better-auth/plugins');
      const { createHash } = await import('node:crypto');

      const db = {
        user: [], session: [], account: [], verification: [],
        oauthApplication: [], oauthAccessToken: [], oauthConsent: [],
      };
      const base = 'http://localhost:3001';
      const auth = betterAuth({
        baseURL: base,
        secret: 'test-secret-at-least-32-characters-long',
        database: memoryAdapter(db),
        emailAndPassword: { enabled: true },
        plugins: [mcp({
          loginPage: 'http://localhost:3000/login',
          resource: base + '/mcp',
          metadata: { scopes_supported: ['boards:read', 'boards:write'] },
          oidcConfig: {
            loginPage: 'http://localhost:3000/login',
            consentPage: 'http://localhost:3000/mcp/consent',
            scopes: ['boards:read', 'boards:write'],
            requirePKCE: true,
            allowPlainCodeChallengeMethod: false,
            allowDynamicClientRegistration: true,
          },
        })],
      });

      const jar = new Map();
      function saveCookies(response) {
        for (const value of response.headers.getSetCookie()) {
          const [pair] = value.split(';');
          const index = pair.indexOf('=');
          jar.set(pair.slice(0, index), pair.slice(index + 1));
        }
      }
      function cookies() {
        return [...jar].map(([key, value]) => key + '=' + value).join('; ');
      }
      async function call(path, init = {}) {
        const headers = new Headers(init.headers);
        if (jar.size) headers.set('cookie', cookies());
        if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
        const response = await auth.handler(new Request(base + path, { ...init, headers, redirect: 'manual' }));
        saveCookies(response);
        return response;
      }
      async function json(path, body) {
        return call(path, { method: 'POST', body: JSON.stringify(body) });
      }

      const provider = await call('/api/auth/.well-known/oauth-authorization-server')
        .then((result) => result.json());
      const resource = await call('/api/auth/.well-known/oauth-protected-resource')
        .then((result) => result.json());

      let response = await json('/api/auth/sign-up/email', {
        name: 'MCP Test', email: 'mcp@example.com', password: 'password1234'
      });
      if (!response.ok) throw new Error('signup failed: ' + await response.text());

      response = await json('/api/auth/mcp/register', {
        redirect_uris: ['http://localhost:7777/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        client_name: 'Local test client',
      });
      const client = await response.json();
      if (response.status !== 201) throw new Error('registration failed: ' + JSON.stringify(client));

      const verifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      async function authorize(state) {
        const query = new URLSearchParams({
          response_type: 'code', client_id: client.client_id,
          redirect_uri: 'http://localhost:7777/callback',
          scope: 'openid offline_access boards:read boards:write',
          state, prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256',
        });
        const result = await call('/api/auth/mcp/authorize?' + query);
        return new URL(result.headers.get('location'));
      }
      async function decide(consentUrl, accept) {
        return json('/api/auth/oauth2/consent', {
          accept, consent_code: consentUrl.searchParams.get('consent_code')
        }).then((result) => result.json());
      }
      async function token(code) {
        return call('/api/auth/mcp/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code', code, client_id: client.client_id,
            redirect_uri: 'http://localhost:7777/callback', code_verifier: verifier,
          }),
        }).then((result) => result.json());
      }

      const consentUrl = await authorize('approved');
      const approved = await decide(consentUrl, true);
      const approvedToken = await token(new URL(approved.redirectURI).searchParams.get('code'));
      const refreshed = await call('/api/auth/mcp/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token', refresh_token: approvedToken.refresh_token,
          client_id: client.client_id,
        }),
      }).then((result) => result.json());

      const denied = await decide(await authorize('denied'), false);

      await json('/api/auth/sign-out', {});
      const loginUrl = await authorize('continuation');
      const signIn = await json('/api/auth/sign-in/email', {
        email: 'mcp@example.com', password: 'password1234'
      });

      console.log(JSON.stringify({
        provider,
        resource,
        approvedScope: approvedToken.scope,
        refreshed: Boolean(refreshed.access_token),
        denied: denied.redirectURI,
        loginUrl: loginUrl.toString(),
        continuationLocation: signIn.headers.get('location'),
      }));
    `

    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })
    const result = JSON.parse(output.trim().split('\n').at(-1)!)

    expect(result.provider.registration_endpoint).toBe(
      'http://localhost:3001/api/auth/mcp/register',
    )
    expect(result.provider.code_challenge_methods_supported).toEqual(['S256'])
    expect(result.resource.resource).toBe('http://localhost:3001/mcp')
    expect(result.approvedScope).toContain('boards:read')
    expect(result.approvedScope).toContain('boards:write')
    expect(result.refreshed).toBe(true)
    expect(result.denied).toContain('error=access_denied')
    expect(result.loginUrl).toContain('http://localhost:3000/login')
    expect(result.continuationLocation).toContain('http://localhost:3000/mcp/consent')
  })
})
