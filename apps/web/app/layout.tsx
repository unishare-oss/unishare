import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/src/providers'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Unishare',
    default: 'Unishare — Student Resource Sharing',
  },
  description:
    "Every lecture note, past paper, and study guide — shared by students who've been there.",
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#F7F3EE',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <Script
          defer
          src="https://analytics.psstee.dev/script.js"
          data-website-id="ab4d7758-1c52-4fc4-943b-0c7bf7a374f5"
        />
      </body>
    </html>
  )
}
