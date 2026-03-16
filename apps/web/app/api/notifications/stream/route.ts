import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? ''

  const upstream = await fetch(`${API_URL}/api/notifications/stream`, {
    headers: { cookie },
  })

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
