// Worker certificate status helpers — used in the workers list and detail
// pages to surface expired or expiring credentials prominently. Same logic
// will gate rostering once that's built (block creating shifts when a
// worker's check is expired).

export type CertStatus = "unset" | "expired" | "expiring" | "active";

export const EXPIRY_WARNING_DAYS = 30;

export function certStatus(
  expiry: Date | null | undefined,
  now: Date = new Date()
): CertStatus {
  if (!expiry) return "unset";
  const expiryTime = expiry.getTime();
  if (expiryTime < now.getTime()) return "expired";
  const days = (expiryTime - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= EXPIRY_WARNING_DAYS) return "expiring";
  return "active";
}

export const CERT_LABEL: Record<CertStatus, string> = {
  unset: "Not recorded",
  expired: "Expired",
  expiring: "Expiring soon",
  active: "Current",
};

/**
 * Aggregate worker status: the worst of all certificates. If any cert is
 * expired, the worker is "expired"; otherwise the highest tier across all
 * certs. Drives the row-level badge in the workers list.
 */
export function worstStatus(...statuses: CertStatus[]): CertStatus {
  const order: CertStatus[] = ["unset", "active", "expiring", "expired"];
  return statuses.reduce((worst, current) => {
    return order.indexOf(current) > order.indexOf(worst) ? current : worst;
  }, "active" as CertStatus);
}