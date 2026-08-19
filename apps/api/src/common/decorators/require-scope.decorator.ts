import { ForbiddenException } from '@nestjs/common'

export interface ScopedSession {
  scopes: string
}

/**
 * Method decorator that enforces the presence of one or more OAuth scopes
 * on a session object passed as the first argument to the method.
 */
export function RequireScope(...requiredScopes: string[]) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    descriptor.value = async function (...args: unknown[]) {
      const session = args[0] as ScopedSession | undefined
      const sessionScopes = session?.scopes?.split(/\s+/) ?? []
      for (const scope of requiredScopes) {
        if (!sessionScopes.includes(scope)) {
          throw new ForbiddenException(`Missing required scope: ${scope}`)
        }
      }
      return originalMethod.apply(this, args)
    }
    return descriptor
  }
}
