import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields, adminClient } from 'better-auth/client/plugins'
import { ac, roles } from '../permissions'

export const authClient = createAuthClient({
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: 'string', input: false },
        departmentId: { type: 'string', input: false },
        universityId: { type: 'string', input: true },
      },
    }),
    adminClient({ ac, roles }),
  ],
})
