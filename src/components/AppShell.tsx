"use client";

import { cx } from "./ui/cx";
import { LecturaEnCurso } from "./LecturaEnCurso";
import { Sidebar, useSidebarLayout } from "./Sidebar";
import { SubidasPanel } from "./SubidasPanel";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, animate } = useSidebarLayout();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        className={cx(
          "min-w-0 lg:min-h-screen",
          collapsed ? "lg:pl-14" : "lg:pl-[208px]",
          animate && "transition-[padding] duration-(--dur-pop) ease-(--ease-out) motion-reduce:transition-none"
        )}
      >
        {children}
      </main>
      <div className="pointer-events-none fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-[35] flex flex-col gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-80">
        <SubidasPanel />
        <div className="pointer-events-auto empty:hidden">
          <LecturaEnCurso />
        </div>
      </div>
    </div>
  );
}
