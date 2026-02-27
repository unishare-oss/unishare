import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
})

// better-auth doesn't infer additionalFields on the client without sharing the
// server auth type. Extend the session user type manually to include `role`.
export type SessionUser = typeof authClient.$Infer.Session.user & {
  role: 'STUDENT' | 'MODERATOR' | 'ADMIN'
}
