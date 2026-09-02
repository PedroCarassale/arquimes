"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "white" | "yellow";
}

export function Logo({ size = "md", variant = "white" }: LogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const fill = variant === "yellow" ? "rgb(243, 164, 75)" : "#e8e6e3";

  return (
    <svg
      viewBox="0 0 32 32"
      className={sizeClasses[size]}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Arquimes"
    >
      <circle cx="16" cy="16" r="14" stroke={fill} strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="16" r="10" stroke={fill} strokeWidth="1" fill="none" opacity="0.6" />
      <circle cx="16" cy="16" r="6" stroke={fill} strokeWidth="0.75" fill="none" opacity="0.4" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={fill} strokeWidth="1" />
      <line x1="16" y1="26" x2="16" y2="30" stroke={fill} strokeWidth="1" />
      <line x1="2" y1="16" x2="6" y2="16" stroke={fill} strokeWidth="1" />
      <line x1="26" y1="16" x2="30" y2="16" stroke={fill} strokeWidth="1" />
      <line x1="16" y1="16" x2="24" y2="8" stroke={fill} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2" fill={fill} />
      <circle cx="24" cy="8" r="1.5" fill={fill} />
    </svg>
  );
}

export function LogoWithText({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2">
      <Logo size={size} />
      <span className={`font-serif font-medium tracking-tight ${textSizes[size]}`}>
        Arquimes
      </span>
    </div>
  );
}
