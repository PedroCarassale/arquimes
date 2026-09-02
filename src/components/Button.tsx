"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

    const variantStyles = {
      primary:
        "bg-accent text-background hover:bg-accent/90 active:bg-accent/80",
      secondary:
        "bg-surface-elevated border border-border text-foreground hover:bg-surface hover:border-foreground-muted",
      ghost:
        "text-foreground-muted hover:text-foreground hover:bg-surface-elevated",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

interface ButtonLabelProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function ButtonLabel({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
}: ButtonLabelProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors";

  const variantStyles = {
    primary:
      "bg-accent text-background hover:bg-accent/90 active:bg-accent/80",
    secondary:
      "bg-surface-elevated border border-border text-foreground hover:bg-surface hover:border-foreground-muted",
    ghost:
      "text-foreground-muted hover:text-foreground hover:bg-surface-elevated",
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"
      } ${className}`}
    >
      {children}
    </span>
  );
}
