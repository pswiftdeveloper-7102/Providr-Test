import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type Mode = {
  href: string;
  label: string;
  description: string;
  icon: typeof Zap;
  badge: string;
  badgeTone: "neutral" | "recommended" | "advanced";
  recommended?: boolean;
};

const MODES: Mode[] = [
  {
    href: "/provider/incidents/new/quick",
    label: "Quick Report",
    description:
      "Log an incident in under 2 minutes. Saves as draft for your supervisor to complete.",
    icon: Zap,
    badge: "Mobile-friendly",
    badgeTone: "neutral",
  },
  {
    href: "/provider/incidents/new/ai",
    label: "AI-Assisted Report",
    description:
      "Describe what happened in your own words. Providr structures the report for you.",
    icon: Sparkles,
    badge: "Recommended",
    badgeTone: "recommended",
    recommended: true,
  },
  {
    href: "/provider/incidents/new/wizard",
    label: "Compliance Wizard",
    description:
      "Step-by-step guidance through every NDIS requirement. Use for complex or reportable incidents.",
    icon: ClipboardList,
    badge: "For complex incidents",
    badgeTone: "advanced",
  },
];

export default async function ReportIncidentPickerPage() {
  const context = await resolvePortalContext("provider");
  requireManager(context);

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Report an Incident
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how you&apos;d like to create this report.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className="block">
              <Card
                className={cn(
                  "h-full transition-colors",
                  m.recommended
                    ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-muted/40"
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge
                      variant={
                        m.badgeTone === "recommended"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {m.badge}
                    </Badge>
                  </div>
                  <CardTitle
                    className={cn("mt-4", m.recommended && "text-primary")}
                  >
                    {m.label}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {m.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}