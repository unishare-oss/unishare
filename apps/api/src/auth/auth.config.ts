import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { openAPI, admin, anonymous } from 'better-auth/plugins'
import { generateGuestDisplayName } from './guest-display-name'
import { ac, roles } from '../lib/permissions'
import { UserRole } from '../generated/prisma/client'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const isProduction = process.env.NODE_ENV === 'production'

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
  advanced: {
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: process.env.COOKIE_DOMAIN,
    },
  },
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      allowDifferentEmails: true,
    },
  },
  socialProviders: {
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
      tenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
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
    user: {
      create: {
        // Consent timestamp is always set server-side for all signup flows
        // (both OAuth and email/password). This ensures it's never missing.
        after: async (user) => {
          if (!user.consentGivenAt) {
            await prisma.user.update({
              where: { id: user.id },
              data: { consentGivenAt: new Date() },
            })
          }
        },
      },
    },
  },
})

export type Auth = typeof auth
export type UserSession = typeof auth.$Infer.Session
