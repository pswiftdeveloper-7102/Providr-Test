import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ComingSoonItem = {
  title: string;
  description: string;
};

type Props = {
  icon: LucideIcon;
  pageTitle: string;
  pageSubtitle?: string;
  status?: string;
  cardTitle: string;
  cardDescription: string;
  items: ComingSoonItem[];
  backHref?: string;
  backLabel?: string;
};

/**
 * Shared "coming soon" page used by sidebar destinations that aren't built
 * out yet. Renders a header + card describing what the feature will do,
 * matching the rest of the app's shadcn styling.
 */
export function ComingSoonPage({
  icon: Icon,
  pageTitle,
  pageSubtitle,
  status = "Coming next",
  cardTitle,
  cardDescription,
  items,
  backHref = "/provider",
  backLabel = "Back to overview",
}: Props) {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
          {pageSubtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{pageSubtitle}</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {status}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle>{cardTitle}</CardTitle>
              <CardDescription className="mt-1">
                {cardDescription}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-md border border-dashed p-3"
              >
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div>
            <Button variant="outline" render={<Link href={backHref} />}>
              ← {backLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}