'use client'

import { useEffect } from 'react'
import { signInWithUniauth, takeReturnTo } from '@/src/lib/auth/uniauth'

/**
 * Where unishare's Better Auth sends uniauth errors (onAPIError.errorURL). login_required is
 * the silent check's "not signed in" answer: go back to the page, as a guest. Anything else is
 * a real failure and is explained on /login.
 */
export default function UniauthReturnPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const returnTo = takeReturnTo()
    if (error === 'interaction_required') {
      void signInWithUniauth({
        returnTo: new URL(returnTo ?? '/feed', window.location.origin).href,
      })
      return
    }
    if (!error || error === 'login_required') window.location.replace(returnTo ?? '/feed')
    else window.location.replace(`/login?error=${encodeURIComponent(error)}`)
  }, [])
  return null
}
