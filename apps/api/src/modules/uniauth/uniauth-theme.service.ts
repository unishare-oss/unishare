import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { auth } from '@/auth/auth.config'
import { UNIAUTH_PROVIDER_ID, uniauthConfig } from '@/auth/uniauth-config'
import { isThemeId } from '@unishare-oss/unitheme'

@Injectable()
export class UniauthThemeService {
  constructor(private readonly prisma: PrismaService) {}

  async exchange(userId: string, theme?: string) {
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: UNIAUTH_PROVIDER_ID },
      select: { id: true },
    })
    if (!account) throw new UnauthorizedException('Sign in with UniAuth to sync your theme')
    try {
      // Better Auth refreshes expired OAuth tokens. Tokens and client secrets never enter the browser.
      const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: account.id, userId },
      })
      const endpoint = new URL('/api/preferences/theme/exchange', uniauthConfig.issuer)
      const response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${encodeURIComponent(uniauthConfig.clientId)}:${encodeURIComponent(uniauthConfig.clientSecret)}`).toString('base64')}`,
        },
        body: JSON.stringify({ accessToken, ...(theme ? { theme } : {}) }),
      })
      if (!response.ok) throw new Error('Theme exchange failed')
      const data = (await response.json()) as { theme: unknown }
      if (data.theme !== null && !isThemeId(data.theme)) throw new Error('Invalid theme response')
      return { theme: data.theme as string | null }
    } catch {
      throw new ServiceUnavailableException(
        'Could not sync your theme. Try again or sign in again.',
      )
    }
  }
}
