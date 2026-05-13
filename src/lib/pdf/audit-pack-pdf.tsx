// Audit Pack PDF — point-in-time compliance bundle. Same shape as the
// on-screen audit-pack page (Provider portal) so what the admin sees is
// what auditors get.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { renderToBuffer } from "./renderer";

type Severity = "MINOR" | "MODERATE" | "SERIOUS" | "REPORTABLE";

export type AuditPackData = {
  org: { legalName: string; tradingName: string | null };
  windowFrom: Date;
  windowTo: Date;
  generatedAt: Date;
  stats: {
    participants: number;
    workers: number;
    shiftsInWindow: number;
    shiftHoursInWindow: number;
    incidentsInWindow: number;
    reportableInWindow: number;
    submittedOnTime: number;
    submittedLate: number;
    stillPending: number;
    activeCarePlans: number;
    activeAgreements: number;
  };
  certIssues: Array<{
    worker: string;
    ndisExpiry: Date | null;
    firstAidExpiry: Date | null;
    status: "expired" | "expiring" | "unset";
  }>;
  incidents: Array<{
    occurredAt: Date;
    participant: string | null;
    severity: Severity;
    status: string;
    reportedToNdisAt: Date | null;
    description: string;
  }>;
  agreements: Array<{
    participant: string;
    startDate: Date;
    endDate: Date | null;
    signedAt: Date | null;
    status: string;
  }>;
  carePlans: Array<{
    participant: string;
    goalCount: number;
  }>;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
    lineHeight: 1.45,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 10,
    marginBottom: 14,
  },
  brand: {
    fontSize: 9,
    color: "#6b7280",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
    color: "#111827",
  },
  subhead: {
    fontSize: 10,
    color: "#4b5563",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  statCard: {
    width: "32%",
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#9ca3af",
  },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  statLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    paddingBottom: 3,
    marginBottom: 4,
  },
  tableHeadCell: {
    fontSize: 8.5,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
  },
  cellGrow: { flex: 1 },
  cellNarrow: { width: 70 },
  cellMid: { width: 100 },
  empty: { fontStyle: "italic", color: "#9ca3af", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
  badge: {
    fontSize: 8,
    color: "#374151",
  },
  danger: { color: "#b91c1c" },
  warn: { color: "#b45309" },
  good: { color: "#047857" },
});

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function AuditPackDoc({ data }: { data: AuditPackData }) {
  const orgName = data.org.tradingName ?? data.org.legalName;

  return (
    <Document title={`Audit pack — ${orgName}`} author={data.org.legalName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Audit Pack</Text>
          <Text style={styles.title}>{orgName}</Text>
          <Text style={styles.subhead}>
            {fmt(data.windowFrom)} — {fmt(data.windowTo)} · Generated{" "}
            {fmt(data.generatedAt)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>At a glance</Text>
        <View style={styles.statRow}>
          <Stat label="Participants" value={data.stats.participants} />
          <Stat label="Workers" value={data.stats.workers} />
          <Stat
            label="Active care plans"
            value={data.stats.activeCarePlans}
          />
          <Stat
            label="Active agreements"
            value={data.stats.activeAgreements}
          />
          <Stat
            label="Shifts in window"
            value={data.stats.shiftsInWindow}
          />
          <Stat
            label="Shift hours"
            value={`${data.stats.shiftHoursInWindow.toFixed(1)} h`}
          />
        </View>

        <Text style={styles.sectionTitle}>Incidents & NDIS reporting</Text>
        <View style={styles.statRow}>
          <Stat label="Incidents" value={data.stats.incidentsInWindow} />
          <Stat
            label="Reportable"
            value={data.stats.reportableInWindow}
            tone={data.stats.reportableInWindow > 0 ? "warn" : "good"}
          />
          <Stat
            label="Submitted on time"
            value={data.stats.submittedOnTime}
            tone="good"
          />
          <Stat
            label="Submitted late"
            value={data.stats.submittedLate}
            tone={data.stats.submittedLate > 0 ? "danger" : "good"}
          />
          <Stat
            label="Still pending"
            value={data.stats.stillPending}
            tone={data.stats.stillPending > 0 ? "danger" : "good"}
          />
        </View>

        <Text style={styles.sectionTitle}>Certificate issues</Text>
        {data.certIssues.length === 0 ? (
          <Text style={styles.empty}>
            No worker certificates expired or expiring within the window.
          </Text>
        ) : (
          <>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.cellGrow]}>Worker</Text>
              <Text style={[styles.tableHeadCell, styles.cellMid]}>NDIS check</Text>
              <Text style={[styles.tableHeadCell, styles.cellMid]}>First Aid</Text>
              <Text style={[styles.tableHeadCell, styles.cellNarrow]}>Status</Text>
            </View>
            {data.certIssues.map((c, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={styles.cellGrow}>{c.worker}</Text>
                <Text style={styles.cellMid}>{fmt(c.ndisExpiry)}</Text>
                <Text style={styles.cellMid}>{fmt(c.firstAidExpiry)}</Text>
                <Text
                  style={[
                    styles.cellNarrow,
                    c.status === "expired" ? styles.danger : {},
                    c.status === "expiring" ? styles.warn : {},
                  ]}
                >
                  {c.status}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Incidents in window</Text>
        {data.incidents.length === 0 ? (
          <Text style={styles.empty}>No incidents recorded in this window.</Text>
        ) : (
          <>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.cellMid]}>Occurred</Text>
              <Text style={[styles.tableHeadCell, styles.cellGrow]}>Participant</Text>
              <Text style={[styles.tableHeadCell, styles.cellNarrow]}>Severity</Text>
              <Text style={[styles.tableHeadCell, styles.cellNarrow]}>Status</Text>
              <Text style={[styles.tableHeadCell, styles.cellMid]}>NDIS sub.</Text>
            </View>
            {data.incidents.slice(0, 40).map((inc, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={styles.cellMid}>{fmt(inc.occurredAt)}</Text>
                <Text style={styles.cellGrow}>{inc.participant ?? "—"}</Text>
                <Text
                  style={[
                    styles.cellNarrow,
                    inc.severity === "REPORTABLE" ? styles.danger : {},
                    inc.severity === "SERIOUS" ? styles.warn : {},
                  ]}
                >
                  {inc.severity.toLowerCase()}
                </Text>
                <Text style={styles.cellNarrow}>{inc.status}</Text>
                <Text style={styles.cellMid}>{fmt(inc.reportedToNdisAt)}</Text>
              </View>
            ))}
            {data.incidents.length > 40 && (
              <Text style={styles.empty}>
                + {data.incidents.length - 40} more — see Incidents page for the
                full list.
              </Text>
            )}
          </>
        )}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Service agreements</Text>
        {data.agreements.length === 0 ? (
          <Text style={styles.empty}>No agreements in this window.</Text>
        ) : (
          <>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.cellGrow]}>Participant</Text>
              <Text style={[styles.tableHeadCell, styles.cellMid]}>Start</Text>
              <Text style={[styles.tableHeadCell, styles.cellMid]}>End</Text>
              <Text style={[styles.tableHeadCell, styles.cellMid]}>Signed</Text>
              <Text style={[styles.tableHeadCell, styles.cellNarrow]}>Status</Text>
            </View>
            {data.agreements.map((a, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={styles.cellGrow}>{a.participant}</Text>
                <Text style={styles.cellMid}>{fmt(a.startDate)}</Text>
                <Text style={styles.cellMid}>{fmt(a.endDate)}</Text>
                <Text style={styles.cellMid}>{fmt(a.signedAt)}</Text>
                <Text style={styles.cellNarrow}>{a.status}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Active care plans</Text>
        {data.carePlans.length === 0 ? (
          <Text style={styles.empty}>No active care plans.</Text>
        ) : (
          <>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.cellGrow]}>Participant</Text>
              <Text style={[styles.tableHeadCell, styles.cellNarrow]}>Goals</Text>
            </View>
            {data.carePlans.map((cp, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={styles.cellGrow}>{cp.participant}</Text>
                <Text style={styles.cellNarrow}>{cp.goalCount}</Text>
              </View>
            ))}
          </>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${orgName} · Audit pack · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "good" | "warn" | "danger";
}) {
  return (
    <View style={styles.statCard}>
      <Text
        style={[
          styles.statValue,
          tone === "danger" ? styles.danger : {},
          tone === "warn" ? styles.warn : {},
          tone === "good" ? styles.good : {},
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export async function renderAuditPackPdf(
  data: AuditPackData
): Promise<Buffer> {
  return renderToBuffer(<AuditPackDoc data={data} />);
}