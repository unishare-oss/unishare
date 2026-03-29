'use client'

import { motion } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'

interface ChatPageTransitionProps {
  children: ReactNode
  direction?: 'forward' | 'back'
}

export function ChatPageTransition({ children, direction = 'forward' }: ChatPageTransitionProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile) {
    return <div className="flex flex-col h-full w-full">{children}</div>
  }

  return (
    <motion.div
      className="flex flex-col h-full w-full"
      initial={{ x: direction === 'forward' ? '100%' : '-30%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction === 'forward' ? '-30%' : '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.8 }}
    >
      {children}
    </motion.div>
  )
}
