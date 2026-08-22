import { ForbiddenException } from '@nestjs/common'

export interface ScopedSession {
  scopes: string
}

/** Metadata key the scopes are stored under on the wrapped method — read by McpService to
 * decide which tools to register for a given session's granted scopes, so the requirement
 * is declared once at the `@RequireScope(...)` call site instead of duplicated in a table. */
export const MCP_SCOPES_KEY = 'mcp:scopes'

/**
 * Method decorator that enforces the presence of one or more OAuth scopes
 * on a session object passed as the first argument to the method.
 */
export function RequireScope(...requiredScopes: string[]) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const wrapped = async function (this: unknown, ...args: unknown[]) {
      const session = args[0] as ScopedSession | undefined
      const sessionScopes = session?.scopes?.split(/\s+/) ?? []
      for (const scope of requiredScopes) {
        if (!sessionScopes.includes(scope)) {
          throw new ForbiddenException(`Missing required scope: ${scope}`)
        }
      }
      return originalMethod.apply(this, args)
    }
    Reflect.defineMetadata(MCP_SCOPES_KEY, requiredScopes, wrapped)
    descriptor.value = wrapped
    return descriptor
  }
}

/** Reads the scopes a `@RequireScope(...)`-decorated method requires, or `[]` if undecorated. */
export function getRequiredScopes(method: (...args: unknown[]) => unknown): string[] {
  return (Reflect.getMetadata(MCP_SCOPES_KEY, method) as string[] | undefined) ?? []
}
