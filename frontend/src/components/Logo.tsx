interface LogoProps {
  size?: number
  showText?: boolean
  textColor?: string
}

export default function Logo({ size = 32, showText = true, textColor = 'white' }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="logoGrad2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle cx="20" cy="20" r="20" fill="url(#logoGrad)" opacity="0.15" />
        {/* Book/wave shape */}
        <path d="M10 13 C10 13 15 11 20 13 C25 15 30 13 30 13 L30 28 C30 28 25 26 20 28 C15 30 10 28 10 28 Z" 
              fill="url(#logoGrad)" opacity="0.9"/>
        {/* Wave lines (sync symbol) */}
        <path d="M13 19 Q16 17 20 19 Q24 21 27 19" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M13 22.5 Q16 20.5 20 22.5 Q24 24.5 27 22.5" stroke="#bfdbfe" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7"/>
        {/* Top spark dot */}
        <circle cx="20" cy="8" r="2.5" fill="url(#logoGrad2)" />
        <path d="M20 10.5 L20 12.5" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {showText && (
        <span
          style={{ color: textColor, fontFamily: 'Sora, system-ui, sans-serif', fontWeight: 700, fontSize: size * 0.55, letterSpacing: '-0.02em' }}
        >
          Study<span style={{ color: '#60a5fa' }}>Sync</span>
        </span>
      )}
    </div>
  )
}
