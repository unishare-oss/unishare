import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import localFont from 'next/font/local'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/src/providers'
import { ThemeProvider } from '@/components/theme-provider'
import { THEME_COOKIE, isThemeId, isDarkTheme, resolveTheme } from '@unishare-oss/unitheme'
import './globals.css'
import '@unishare-oss/unitheme/themes.css'
import '@unishare-oss/unitheme/picker.css'
import 'prismjs/themes/prism-tomorrow.css'

// Latin subsets of the Google Fonts files (OFL, licences next to them). globals.css builds the
// --font-display, --font-body, --font-read and --font-mono stacks from these variables.
// Baloo 2 and Literata are not preloaded: no page uses them yet.
const baloo = localFont({
  src: '../fonts/Baloo2.woff2',
  variable: '--font-baloo',
  weight: '400 800',
  preload: false,
})
const lexend = localFont({
  src: '../fonts/Lexend.woff2',
  variable: '--font-lexend',
  weight: '100 900',
})
const literata = localFont({
  src: '../fonts/Literata.woff2',
  variable: '--font-literata',
  weight: '200 900',
  preload: false,
})
// Both Plex Mono weights are registered so font-bold mono text is not faux-bolded.
const plexMono = localFont({
  src: [
    { path: '../fonts/IBMPlexMono-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/IBMPlexMono-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex-mono',
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
  themeColor: '#f5f6fb',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  minimumScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const cookieTheme = (await cookies()).get(THEME_COOKIE)?.value
  const initialTheme = isThemeId(cookieTheme) ? cookieTheme : undefined
  const theme = resolveTheme(initialTheme)
  const appUrl = process.env.APP_URL ?? 'https://share.psstee.me'
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
    <html lang="en" className={`${theme}${isDarkTheme(theme) ? ' dark' : ''}`}>
      <body
        className={`${baloo.variable} ${lexend.variable} ${literata.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider initialTheme={initialTheme}>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
