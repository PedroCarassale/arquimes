"use client";

import { Logo } from "./Logo";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6 opacity-30">
        <Logo size="lg" />
      </div>
      <h2 className="font-serif text-xl text-foreground mb-2">{title}</h2>
      <p className="text-foreground-muted max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
