const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface ApiResult<T> {
  data: T
  message: string
}

export const customFetch = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> => {
  const response = await fetch(`${API_URL}${url}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const json: ApiResponse<T> = await response.json()

  if (!response.ok) {
    throw new Error(json.message ?? 'An error occurred')
  }

  return {
    data: json.data,
    message: json.message,
  }
}
