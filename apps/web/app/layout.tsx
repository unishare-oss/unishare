import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/src/providers'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'
import './themes.css'
import 'prismjs/themes/prism-tomorrow.css'

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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Unishare',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: '/android-chrome-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#F7F3EE',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  minimumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="theme-unishare"
          themes={[
            'theme-unishare',
            'theme-catppuccin-mocha',
            'theme-catppuccin-latte',
            'theme-nord',
            'theme-arctic',
            'theme-tokyo-night',
            'theme-dracula',
            'theme-gruvbox-dark',
            'theme-midnight-library',
            'theme-parchment',
            'theme-ocean-depth',
            'theme-sakura',
          ]}
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
        <Script
          defer
          src="https://analytics.psstee.dev/script.js"
          data-website-id="ab4d7758-1c52-4fc4-943b-0c7bf7a374f5"
        />
      </body>
    </html>
  )
}
