import { createAccessControl } from 'better-auth/plugins/access'

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
  STUDENT: student,
  MODERATOR: moderator,
  ADMIN: admin,
}

export { ac }
