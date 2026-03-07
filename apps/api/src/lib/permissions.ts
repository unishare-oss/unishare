import { createAccessControl } from 'better-auth/plugins/access'
import { UserRole } from '../generated/prisma/client'

export const statement = {
  user: ['list', 'set-role', 'ban'],
  post: ['create', 'view', 'delete', 'approve', 'reject'],
  comment: ['create', 'view', 'delete'],
} as const

const ac = createAccessControl(statement)

export const student = ac.newRole({
  post: ['create', 'view'],
  comment: ['create', 'view'],
})

export const moderator = ac.newRole({
  post: ['create', 'view', 'delete', 'approve', 'reject'],
  comment: ['create', 'view', 'delete'],
})

export const admin = ac.newRole({
  user: ['list', 'set-role', 'ban'],
  post: ['create', 'view', 'delete', 'approve', 'reject'],
  comment: ['create', 'view', 'delete'],
})

export const roles = {
  [UserRole.STUDENT]: student,
  [UserRole.MODERATOR]: moderator,
  [UserRole.ADMIN]: admin,
}

export { ac }
