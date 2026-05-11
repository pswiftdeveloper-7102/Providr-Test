import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

export default function ProviderLayout({ children }: { children: ReactNode }) {
  return <AppShell portal="provider">{children}</AppShell>;
}