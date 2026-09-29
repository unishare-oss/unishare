import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { openAPI, admin, anonymous, genericOAuth } from 'better-auth/plugins'
import { generateGuestDisplayName } from './guest-display-name'
import { ac, roles } from '../lib/permissions'
import { UserRole } from '../generated/prisma/client'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { uniauthConfig, UNIAUTH_PROVIDER_ID } from './uniauth-config'
import {
  mapUniauthProfile,
  uniauthSidFromIdToken,
  withoutAvatarPlaceholder,
} from './uniauth-sign-in'

const isProduction = process.env.NODE_ENV === 'production'
export const isMcpEnabled = process.env.MCP_ENABLED === 'true'

if (isProduction) {
  const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'FRONTEND_URL']
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable in production: ${key}`)
    }
  }
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
})

const prisma = new PrismaClient({ adapter })

const trustedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // Errors with no sign-in to return to (e.g. a callback without state). Sign-ins pass
  // errorCallbackURL=/auth/return themselves; the page handles both the same way.
  onAPIError: {
    errorURL: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/return`,
  },
  advanced: {
    // Host-only cookies on the web origin (BETTER_AUTH_URL is the web app, which proxies
    // /api to the API), so no other *.psstee.dev app ever receives unishare's session.
    // The prefix renamed them when they stopped being set on .psstee.dev: browsers still
    // holding the old domain-wide cookies simply don't send a name unishare reads.
    cookiePrefix: 'unishare',
  },
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  // Passwords and Google/Microsoft live only in uniauth: unishare signs users in through the
  // `uniauth` OIDC provider below and keeps just its own session.
  plugins: [
    genericOAuth({
      config: [
        {
          // Callback: <BETTER_AUTH_URL>/api/auth/callback/uniauth (a social provider in 1.7).
          providerId: UNIAUTH_PROVIDER_ID,
          discoveryUrl: `${uniauthConfig.issuer}/.well-known/openid-configuration`,
          clientId: uniauthConfig.clientId,
          clientSecret: uniauthConfig.clientSecret,
          authentication: 'basic',
          pkce: true,
          scopes: ['openid', 'profile', 'email', 'offline_access'],
          // Name, avatar and university are uniauth's: refreshed on every sign-in.
          overrideUserInfo: true,
          mapProfileToUser: mapUniauthProfile(prisma),
          // The web app's silent check signs in with additionalParams { prompt: 'none' }:
          // uniauth answers instantly (signed in) or with login_required.
        },
      ],
    }),
    admin({
      ac,
      roles,
      defaultRole: UserRole.STUDENT,
      adminRoles: [UserRole.ADMIN],
    }),
    anonymous({
      emailDomainName: 'guest.unishare.app',
      generateName: () => generateGuestDisplayName(),
    }),
    ...(isProduction ? [] : [openAPI()]),
  ],
  trustedOrigins,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAgeUnitInMilliseconds: 60 * 60 * 1000,
    additionalFields: {
      displayName: {
        type: 'string' as const,
        required: false,
        input: false,
        returned: true,
      },
      isViewOnly: {
        type: 'boolean' as const,
        required: false,
        defaultValue: false,
        input: false,
        returned: true,
      },
      uniauthSid: {
        type: 'string' as const,
        required: false,
        input: false,
        returned: false,
      },
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'STUDENT',
        input: false,
        returned: true,
      },
      departmentId: {
        type: 'string',
        required: false,
        input: false,
        returned: true,
      },
      universityId: {
        type: 'string',
        required: false,
        input: true,
        returned: true,
      },
      consentGivenAt: {
        type: 'date',
        required: false,
        input: false,
        returned: true,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Remember which uniauth session this sign-in came from (the ID token's sid, which
        // Better Auth has just saved on the account), so a back-channel logout for one device
        // ends only this device's unishare sessions. Guests have no uniauth account.
        before: async (session, ctx) => {
          const accounts = ctx ? await ctx.context.internalAdapter.findAccounts(session.userId) : []
          const uniauth = accounts.find((a) => a.providerId === UNIAUTH_PROVIDER_ID)
          const uniauthSid = uniauthSidFromIdToken(uniauth?.idToken)
          return { data: uniauthSid ? { ...session, uniauthSid } : session }
        },
      },
    },
    user: {
      create: {
        before: async (user) => ({ data: withoutAvatarPlaceholder(user) }),
        // Guests accept the terms by continuing as a guest. Everyone else accepts them on
        // unishare's own consent screen (POST /users/me/consent): signing up on another app
        // (unigym) and arriving here through single sign-on is not agreeing to unishare's.
        after: async (user) => {
          if ((user as { isAnonymous?: boolean }).isAnonymous && !user.consentGivenAt) {
            await prisma.user.update({
              where: { id: user.id },
              data: { consentGivenAt: new Date() },
            })
          }
        },
      },
      update: {
        before: async (data) => ({ data: withoutAvatarPlaceholder(data) }),
      },
    },
  },
})

export type Auth = typeof auth
export type UserSession = typeof auth.$Infer.Session
