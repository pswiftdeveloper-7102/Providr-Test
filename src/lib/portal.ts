import type { Portal } from "@prisma/client";

export type PortalKey = "provider" | "sc" | "worker";

export const PORTAL_LABEL: Record<PortalKey, string> = {
  provider: "Provider",
  sc: "Support Coordinator",
  worker: "Support Worker",
};

export const PORTAL_DESCRIPTION: Record<PortalKey, string> = {
  provider:
    "Run the operations side: rostering, shifts, care plans, incidents, compliance.",
  sc: "Coordinate participants across providers: plan, budget, evidence, escalations.",
  worker: "Clock into shifts from the field, write notes, log incidents.",
};

export function portalKey(p: Portal): PortalKey {
  switch (p) {
    case "PROVIDER":
      return "provider";
    case "SC":
      return "sc";
    case "WORKER":
      return "worker";
  }
}

export function portalEnum(k: PortalKey): Portal {
  switch (k) {
    case "provider":
      return "PROVIDER";
    case "sc":
      return "SC";
    case "worker":
      return "WORKER";
  }
}

export function portalHref(k: PortalKey): string {
  return `/${k}`;
}