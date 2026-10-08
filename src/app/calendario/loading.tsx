import { AppShell } from "@/components/AppShell";
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";

export default function CalendarioGlobalLoading() {
  return (
    <AppShell>
      <CalendarSkeleton />
    </AppShell>
  );
}
