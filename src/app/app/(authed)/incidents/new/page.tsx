import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  recommended?: boolean;
};

const MODES: Mode[] = [
  {
    href: "/app/incidents/new/quick",
    label: "Quick Report",
    description: "Log essentials in under 2 minutes. Saves as draft.",
    icon: Zap,
    badge: "Mobile-friendly",
  },
  {
    href: "/app/incidents/new/ai",
    label: "AI-Assisted Report",
    description:
      "Describe what happened — we'll structure the report for you.",
    icon: Sparkles,
    badge: "Recommended",
    recommended: true,
  },
  {
    href: "/app/incidents/new/wizard",
    label: "Compliance Wizard",
    description:
      "Step-by-step NDIS-compliant flow. Use for reportable incidents.",
    icon: ClipboardList,
    badge: "For complex incidents",
  },
];

export default async function AppPickerPage() {
  const context = await resolvePortalContext("provider");
  requireManager(context);

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/app/incidents" />}
      >
        <ArrowLeft />
        Incidents
      </Button>

      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Report an Incident
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose how you&apos;d like to create this report.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className="block">
              <Card
                className={cn(
                  "transition-colors",
                  m.recommended
                    ? "border-primary/40 bg-primary/5 active:bg-primary/10"
                    : "active:bg-muted/40"
                )}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle
                          className={cn(m.recommended && "text-primary")}
                        >
                          {m.label}
                        </CardTitle>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardDescription className="mt-1">
                        {m.description}
                      </CardDescription>
                      <Badge
                        variant={m.recommended ? "default" : "secondary"}
                        className="mt-3 text-[10px]"
                      >
                        {m.badge}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}