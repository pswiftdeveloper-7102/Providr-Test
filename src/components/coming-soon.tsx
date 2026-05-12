import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

// Used by sidebar items that the spec introduces but haven't been
// built yet. Renders a friendly placeholder instead of a 404 so the
// navigation works end-to-end.
export function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
}: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Coming soon
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Not built yet</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}