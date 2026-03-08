interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export const customFetch = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const json: ApiResponse<unknown> = await response.json()

  if (!response.ok) {
    throw new Error(json.message ?? 'An error occurred')
  }

  return {
    data: json.data,
    message: json.message,
    status: response.status,
    headers: response.headers,
  } as unknown as T
}
