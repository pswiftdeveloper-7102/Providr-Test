import type { Portal } from "@prisma/client";

export type PortalKey = "provider" | "sc";

export const PORTAL_LABEL: Record<PortalKey, string> = {
  provider: "Provider",
  sc: "Support Coordinator",
};

export const PORTAL_DESCRIPTION: Record<PortalKey, string> = {
  provider:
    "Run the operations side: rostering, shifts, care plans, incidents, compliance.",
  sc: "Coordinate participants across providers: plan, budget, evidence, escalations.",
};

export function portalKey(p: Portal): PortalKey {
  return p === "PROVIDER" ? "provider" : "sc";
}

export function portalEnum(k: PortalKey): Portal {
  return k === "provider" ? "PROVIDER" : "SC";
}

export function portalHref(k: PortalKey): string {
  return `/${k}`;
}