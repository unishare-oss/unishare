import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { openAPI, admin } from 'better-auth/plugins'
import { ac, roles } from '../lib/permissions'
import { UserRole } from '../generated/prisma/client'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
})

const prisma = new PrismaClient({ adapter })

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
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
    ...(process.env.NODE_ENV !== 'production' ? [openAPI()] : []),
  ],
  trustedOrigins: [
    'http://localhost:3000',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
      domain: process.env.COOKIE_DOMAIN,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAgeUnitInMilliseconds: 60 * 60 * 1000,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  user: {
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
    },
  },
})

export type Auth = typeof auth
export type UserSession = typeof auth.$Infer.Session
