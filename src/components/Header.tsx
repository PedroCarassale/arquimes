"use client";

import Link from "next/link";
import { LogoWithText } from "./Logo";

export function Header() {
  return (
    <header className="border-b border-border-subtle">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/materias" className="hover:opacity-80 transition-opacity">
          <LogoWithText size="sm" />
        </Link>
      </div>
    </header>
  );
}
