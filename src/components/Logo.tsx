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
      {/* Sleek SVG Icon representing II (Insight Inventory) & charts / metrics */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 transition-transform hover:scale-105 duration-200 ${iconClassName}`}
      >
        {/* Left Column (Insight - Indigo/Violet Gradient) */}
        <rect x="6" y="14" width="6" height="12" rx="3" fill="url(#logo-grad-indigo)" />
        <circle cx="9" cy="8" r="3" fill="url(#logo-grad-indigo)" />
        
        {/* Right Column (Inventory & Sales Growth - Emerald/Green Gradient) */}
        <rect x="16" y="8" width="6" height="18" rx="3" fill="url(#logo-grad-emerald)" />
        <circle cx="19" cy="3" r="3" fill="url(#logo-grad-emerald)" />
        
        <defs>
          <linearGradient id="logo-grad-indigo" x1="6" y1="8" x2="12" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="logo-grad-emerald" x1="16" y1="3" x2="22" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      
      {!iconOnly && (
        <span className={`font-bold tracking-tight text-slate-900 dark:text-white flex items-center leading-none text-lg ${textClassName}`}>
          <span className="text-indigo-600 font-extrabold">Insight</span>
          <span className="text-slate-800 dark:text-slate-100 ml-1 font-semibold">Inventory</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
