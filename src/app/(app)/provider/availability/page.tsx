import { CalendarRange } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function AvailabilityPage() {
  return (
    <ComingSoon
      title="Availability"
      description="Worker availability windows and recurring unavailability. Used by the roster to filter who can be assigned to a shift."
      icon={CalendarRange}
    />
  );
}