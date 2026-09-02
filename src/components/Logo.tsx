import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: number;
  iconClassName?: string;
  textClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = "",
  iconOnly = false,
  size = 32,
  iconClassName = "",
  textClassName = ""
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Reed Stylus & Tablet: a clay ledger tablet crossed by a stylus stroke
          that doubles as an upward sales line — the scribe's tool of record. */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 transition-transform hover:scale-105 duration-200 ${iconClassName}`}
      >
        {/* Tablet (Indigo/Violet Gradient) */}
        <rect x="10" y="14" width="34" height="40" rx="7" fill="url(#logo-grad-tablet)" />
        <rect x="16" y="24" width="18" height="2.4" rx="1.2" fill="#ffffff" opacity="0.38" />
        <rect x="16" y="32" width="18" height="2.4" rx="1.2" fill="#ffffff" opacity="0.3" />
        <rect x="16" y="40" width="14" height="2.4" rx="1.2" fill="#ffffff" opacity="0.24" />

        {/* Stylus stroke (Emerald Gradient) */}
        <polygon points="29,53 38,57 58,13 51,9" fill="url(#logo-grad-stylus)" />

        <defs>
          <linearGradient id="logo-grad-tablet" x1="10" y1="14" x2="44" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="logo-grad-stylus" x1="29" y1="57" x2="58" y2="9" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      
      {!iconOnly && (
        <span className={`font-bold tracking-tight text-slate-900 dark:text-white flex items-center leading-none text-lg ${textClassName}`}>
          <span className="text-indigo-600 font-extrabold">My</span>
          <span className="text-slate-800 dark:text-slate-100 ml-1 font-semibold">Skrib</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
