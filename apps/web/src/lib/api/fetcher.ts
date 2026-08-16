interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

/**
 * Carries the HTTP status alongside the server's message, so a caller can tell a 503 (a feature
 * is switched off) from a 403 (this user may not) from a 500 (something broke) — all of which
 * previously arrived as an indistinguishable `Error` and were rendered as one opaque string.
 *
 * Extends `Error`, so every existing `catch` that only reads `.message` is unaffected.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const isFormData = options.body instanceof FormData
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  const json: ApiResponse<unknown> = await response.json()

  if (!response.ok) {
    throw new ApiError(json.message ?? 'An error occurred', response.status)
  }

  return {
    data: json.data,
    message: json.message,
    status: response.status,
    headers: response.headers,
  } as unknown as T
}
