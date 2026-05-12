import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Star, Trash2, Users } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

import { deleteProviderAction } from "../actions";

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("sc");

  const provider = await db.externalProvider.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      engagements: {
        include: {
          participant: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!provider) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/sc/providers" />}>
        <ArrowLeft />
        All providers
      </Button>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Provider
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {provider.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {provider.abn && <span>ABN {provider.abn}</span>}
            {provider.ndisRegistrationNumber && (
              <>
                <span aria-hidden>·</span>
                <span>NDIS {provider.ndisRegistrationNumber}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/sc/providers/${provider.id}/edit`} />}
          >
            <Pencil />
            Edit
          </Button>
          {provider.engagements.length === 0 && (
            <form action={deleteProviderAction.bind(null, provider.id)}>
              <Button variant="outline" size="sm" type="submit">
                <Trash2 />
                Delete
              </Button>
            </form>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Working with them</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              label="Rating"
              value={
                provider.rating ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    {provider.rating}/5
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
            <Row label="Capacity" value={provider.capacityStatus ?? "—"} />
            <Row
              label="Categories"
              value={provider.serviceCategories ?? "—"}
            />
            <Separator />
            <Row label="Contact" value={provider.contactName ?? "—"} />
            <Row label="Email" value={provider.contactEmail ?? "—"} />
            <Row label="Phone" value={provider.contactPhone ?? "—"} />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {provider.rateNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Rate notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {provider.rateNotes}
                </p>
              </CardContent>
            </Card>
          )}

          {provider.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{provider.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Engagements</CardTitle>
                  <CardDescription>
                    Participants this provider is delivering services to.
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Badge variant="outline">{provider.engagements.length}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {provider.engagements.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Not engaged with any participants yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {provider.engagements.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/sc/participants/${e.participant.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {e.participant.firstName} {e.participant.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            since {format(e.createdAt, "dd/MM/yyyy")}
                          </div>
                        </div>
                        <Badge
                          variant={
                            e.status === "ACTIVE"
                              ? "default"
                              : e.status === "DECLINED"
                                ? "destructive"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {e.status.toLowerCase().replace("_", " ")}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}