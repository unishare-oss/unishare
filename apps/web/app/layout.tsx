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
  metadataBase: new URL(
    process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ),
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
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: 'Unishare — Student Resource Sharing',
    description:
      "Every lecture note, past paper, and study guide — shared by students who've been there.",
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Unishare' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unishare — Student Resource Sharing',
    description:
      "Every lecture note, past paper, and study guide — shared by students who've been there.",
    images: ['/og-image.png'],
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
  const appUrl = process.env.APP_URL ?? 'https://share.psstee.dev'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Unishare',
    url: appUrl,
    description:
      "Every lecture note, past paper, and study guide — shared by students who've been there.",
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${appUrl}/feed?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
