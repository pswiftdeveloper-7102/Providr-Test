import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolvePortalContext } from "@/lib/session";

export default async function SCHome() {
  const context = await resolvePortalContext("sc");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Support Coordinator portal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {context.activeOrg.tradingName ?? context.activeOrg.legalName}
        </p>
      </header>

      <Card className="border-dashed bg-muted/30">
        <CardHeader>
          <CardTitle>This portal is being scoped for the new market.</CardTitle>
          <CardDescription>
            The Support Coordination role is being restructured by NDIA and
            merged with plan management. We&apos;re holding off on the SC
            portal until the regulation lands so we can scope it for the world
            that&apos;s coming, not the one that&apos;s leaving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            For now, switch back to the Provider portal at the top of the
            screen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}