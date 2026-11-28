export function NotoLogo({ className }: { className?: string }) {
  return (
    <svg data-slot="noto-logo" viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <ellipse cx="60" cy="113" rx="32" ry="5" fill="#000" opacity="0.12" />
      <path
        d="M28 14h52l22 22v58a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V26a12 12 0 0 1 12-12z"
        fill="#ff8a1f"
        stroke="#14213d"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M80 14v14a8 8 0 0 0 8 8h14"
        fill="#ffc27d"
        stroke="#14213d"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <g>
        <ellipse cx="44" cy="54" rx="9" ry="11" fill="#fff" stroke="#14213d" strokeWidth="3" />
        <ellipse cx="72" cy="54" rx="9" ry="11" fill="#fff" stroke="#14213d" strokeWidth="3" />
        <circle cx="46" cy="56" r="4.5" fill="#14213d" />
        <circle cx="74" cy="56" r="4.5" fill="#14213d" />
        <circle cx="44.6" cy="54.2" r="1.5" fill="#fff" />
        <circle cx="72.6" cy="54.2" r="1.5" fill="#fff" />
      </g>
      <circle cx="33" cy="71" r="5" fill="#ff5f8f" opacity="0.6" />
      <circle cx="83" cy="71" r="5" fill="#ff5f8f" opacity="0.6" />
      <path
        d="M50 72q8 8 16 0"
        stroke="#14213d"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M30 90h36"
        stroke="#14213d"
        strokeOpacity="0.25"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}
