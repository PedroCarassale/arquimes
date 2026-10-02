import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-w-0 lg:ml-[208px] lg:min-h-screen">{children}</main>
    </div>
  );
}
