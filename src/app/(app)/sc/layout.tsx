import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

export default function SCLayout({ children }: { children: ReactNode }) {
  return <AppShell portal="sc">{children}</AppShell>;
}