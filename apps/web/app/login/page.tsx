import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — Unishare',
  description: 'Sign in to Unishare to share and discover student resources.',
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg className="size-5" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] bg-surface-dark p-10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-amber text-card font-mono text-xs font-bold">
            U
          </div>
          <span className="font-mono text-lg font-bold text-[#F7F3EE]">Unishare</span>
        </div>

        <blockquote className="max-w-lg">
          <p className="text-[30px] font-light leading-snug text-[#F7F3EE] tracking-tight text-balance">
            {
              'Every lecture note, past paper, and study guide \u2014 shared by students who\u2019ve been there.'
            }
          </p>
        </blockquote>

        <div className="flex items-center gap-8">
          <div>
            <p className="font-mono text-sm text-[#F7F3EE]/60">2,400+ notes</p>
          </div>
          <div>
            <p className="font-mono text-sm text-[#F7F3EE]/60">180 courses</p>
          </div>
          <div>
            <p className="font-mono text-sm text-[#F7F3EE]/60">14 departments</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col items-center justify-center flex-1 bg-background px-6">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-amber text-primary-foreground font-mono text-sm font-bold">
            U
          </div>
          <span className="font-mono text-lg font-bold text-foreground">Unishare</span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-foreground text-center">Sign in</h1>
          <p className="text-sm text-text-secondary text-center mt-2 mb-8">
            Use your university account to continue
          </p>

          <Link
            href="/"
            className="flex items-center justify-center gap-3 w-full h-[42px] bg-card border border-border rounded-[6px] text-sm font-medium text-foreground hover:bg-muted transition-colors duration-150"
          >
            <GoogleIcon />
            Continue with Google
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-3 w-full h-[42px] bg-card border border-border rounded-[6px] text-sm font-medium text-foreground hover:bg-muted transition-colors duration-150 mt-3"
          >
            <MicrosoftIcon />
            Continue with Microsoft
          </Link>

          <p className="text-xs text-text-muted text-center mt-8">
            By signing in, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
