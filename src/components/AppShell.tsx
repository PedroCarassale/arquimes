import { Sidebar } from "./Sidebar";
import { ChatRail } from "./ChatRail";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-[180px] mr-[280px] min-h-screen">{children}</main>
      <ChatRail />
    </div>
  );
}
