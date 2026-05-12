import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Roster configuration — shift templates, default durations, pay rates, and notification preferences for rostering events."
      icon={Settings}
    />
  );
}