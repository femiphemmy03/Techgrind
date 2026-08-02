export default function Logo({ size = 36, withWordmark = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="tgGreenInline" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#39E07A" />
            <stop offset="100%" stopColor="#1FBE63" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="104" fill="#0B0F14" />
        <rect x="90" y="150" width="150" height="40" rx="8" fill="url(#tgGreenInline)" />
        <rect x="140" y="150" width="50" height="212" rx="8" fill="url(#tgGreenInline)" />
        <circle cx="350" cy="256" r="110" fill="none" stroke="url(#tgGreenInline)" strokeWidth="44" />
        <rect x="330" y="228" width="160" height="56" fill="#0B0F14" />
        <rect x="350" y="244" width="92" height="24" rx="6" fill="url(#tgGreenInline)" />
        <rect x="318" y="398" width="20" height="30" rx="4" fill="#FFB020" />
        <rect x="346" y="384" width="20" height="44" rx="4" fill="#FFB020" />
        <rect x="374" y="366" width="20" height="62" rx="4" fill="#FFB020" />
        <polygon points="384,372 420,336 420,364" fill="#FFB020" />
      </svg>
      {withWordmark && <span className="font-display font-extrabold text-lg tracking-tight text-offwhite">TECHGRIND</span>}
    </div>
  );
}
