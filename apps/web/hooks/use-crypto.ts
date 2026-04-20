'use client'

import { useContext } from 'react'
import { CryptoContext } from '@/contexts/crypto-context'

export function useCrypto() {
  const ctx = useContext(CryptoContext)
  if (!ctx) throw new Error('useCrypto must be used within CryptoProvider')
  return ctx
}
