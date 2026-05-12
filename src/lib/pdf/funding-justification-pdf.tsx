// SC Funding Justification Report (Q6) — printable plan-review-ready
// document. Bundles per-bucket spend, per-external-provider rollup, goal
// evidence, and escalations into one PDF the SC can hand to the
// participant or attach to a plan review request.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { renderToBuffer } from "./renderer";

type Bucket = "CORE" | "CAPACITY" | "CAPITAL";

const BUCKET_LABEL: Record<Bucket, string> = {
  CORE: "Core supports",
  CAPACITY: "Capacity building",
  CAPITAL: "Capital",
};

export type FundingJustificationData = {
  org: { legalName: string; tradingName: string | null };
  participant: {
    firstName: string;
    lastName: string;
    ndisNumber: string | null;
  };
  plan: {
    ndisPlanNumber: string | null;
    startDate: Date;
    endDate: Date;
    totalCents: number;
    budgets: Array<{
      category: Bucket;
      totalCents: number;
      spentCents: number;
    }>;
  } | null;
  engagements: Array<{
    providerName: string;
    status: string;
    serviceSummary: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
  }>;
  spendByProvider: Array<{
    providerName: string;
    totalCents: number;
    entryCount: number;
  }>;
  spendByBucket: Array<{
    category: Bucket;
    totalCents: number;
    entryCount: number;
  }>;
  goals: Array<{
    title: string;
    description: string | null;
    status: string;
    evidenceSummary: string | null;
  }>;
  escalations: Array<{
    type: string;
    description: string;
    resolution: string | null;
    openedAt: Date;
    resolvedAt: Date | null;
  }>;
  generatedAt: Date;
};

const styles = StyleSheet.create({
  page: {
    padding: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
    lineHeight: 1.45,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: {
    fontSize: 9,
    color: "#6b7280",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 4,
    color: "#111827",
  },
  subhead: {
    fontSize: 9.5,
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
  intro: {
    color: "#374151",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  rowLabel: {
    width: 130,
    color: "#6b7280",
  },
  rowValue: {
    flex: 1,
    color: "#111827",
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
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
  },
  cellGrow: { flex: 1 },
  cellMoney: { width: 80, textAlign: "right" },
  cellSmall: { width: 50, textAlign: "right" },
  goalCard: {
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    backgroundColor: "#f9fafb",
    borderLeftWidth: 2,
    borderLeftColor: "#9ca3af",
  },
  goalTitle: {
    fontWeight: "bold",
    fontSize: 10.5,
  },
  goalMeta: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 1,
  },
  goalBody: {
    marginTop: 4,
    color: "#374151",
  },
  escalation: {
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    backgroundColor: "#fff7ed",
    borderLeftWidth: 2,
    borderLeftColor: "#fb923c",
  },
  escalationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function FundingJustificationDoc({
  data,
}: {
  data: FundingJustificationData;
}) {
  const participantFullName = `${data.participant.firstName} ${data.participant.lastName}`;
  const totalSpent =
    data.plan?.budgets.reduce((acc, b) => acc + b.spentCents, 0) ?? 0;

  return (
    <Document
      title={`Funding justification — ${participantFullName}`}
      author={data.org.legalName}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            {data.org.tradingName ?? data.org.legalName}
          </Text>
          <Text style={styles.title}>Funding Justification Report</Text>
          <Text style={styles.subhead}>
            {participantFullName}
            {data.participant.ndisNumber
              ? ` · NDIS #${data.participant.ndisNumber}`
              : ""}{" "}
            · Generated {formatDate(data.generatedAt)}
          </Text>
        </View>

        <Text style={styles.intro}>
          This report bundles how the participant&apos;s plan funding was
          used across all engaged providers, the goals it was meant to
          serve, and anything that came up during the plan year. It is
          intended to support an NDIS plan review.
        </Text>

        <Text style={styles.sectionTitle}>1. Plan summary</Text>
        {data.plan ? (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>NDIS plan #</Text>
              <Text style={styles.rowValue}>
                {data.plan.ndisPlanNumber ?? "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Plan period</Text>
              <Text style={styles.rowValue}>
                {formatDate(data.plan.startDate)} — {formatDate(data.plan.endDate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total funding</Text>
              <Text style={styles.rowValue}>
                {formatCents(data.plan.totalCents)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total spent</Text>
              <Text style={styles.rowValue}>
                {formatCents(totalSpent)} ({pct(totalSpent, data.plan.totalCents)})
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.intro}>
            No active plan recorded for this participant.
          </Text>
        )}

        {data.plan && data.plan.budgets.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>2. Funding utilisation by bucket</Text>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.cellGrow]}>Bucket</Text>
              <Text style={[styles.tableHeadCell, styles.cellMoney]}>Funded</Text>
              <Text style={[styles.tableHeadCell, styles.cellMoney]}>Spent</Text>
              <Text style={[styles.tableHeadCell, styles.cellSmall]}>%</Text>
            </View>
            {data.plan.budgets.map((b) => (
              <View key={b.category} style={styles.tableRow}>
                <Text style={styles.cellGrow}>{BUCKET_LABEL[b.category]}</Text>
                <Text style={styles.cellMoney}>{formatCents(b.totalCents)}</Text>
                <Text style={styles.cellMoney}>{formatCents(b.spentCents)}</Text>
                <Text style={styles.cellSmall}>
                  {pct(b.spentCents, b.totalCents)}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>3. Spend by external provider</Text>
        {data.spendByProvider.length === 0 ? (
          <Text style={styles.intro}>No provider-level spend recorded.</Text>
        ) : (
          <>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.cellGrow]}>Provider</Text>
              <Text style={[styles.tableHeadCell, styles.cellSmall]}>Entries</Text>
              <Text style={[styles.tableHeadCell, styles.cellMoney]}>Total</Text>
            </View>
            {data.spendByProvider.map((p) => (
              <View key={p.providerName} style={styles.tableRow}>
                <Text style={styles.cellGrow}>{p.providerName}</Text>
                <Text style={styles.cellSmall}>{p.entryCount}</Text>
                <Text style={styles.cellMoney}>{formatCents(p.totalCents)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>4. Engaged providers</Text>
        {data.engagements.length === 0 ? (
          <Text style={styles.intro}>No providers engaged this plan.</Text>
        ) : (
          data.engagements.map((e, i) => (
            <View
              key={`${e.providerName}-${i}`}
              style={styles.tableRow}
              wrap={false}
            >
              <View style={styles.cellGrow}>
                <Text>{e.providerName}</Text>
                {e.serviceSummary && (
                  <Text style={styles.goalMeta}>{e.serviceSummary}</Text>
                )}
              </View>
              <Text style={styles.cellSmall}>
                {e.status.toLowerCase().replace(/_/g, " ")}
              </Text>
              <Text style={styles.cellMoney}>
                {formatDate(e.startedAt)}
                {e.endedAt ? ` → ${formatDate(e.endedAt)}` : ""}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>5. Goals & outcomes</Text>
        {data.goals.length === 0 ? (
          <Text style={styles.intro}>No goals recorded on the care plan.</Text>
        ) : (
          data.goals.map((g, i) => (
            <View key={i} style={styles.goalCard} wrap={false}>
              <Text style={styles.goalTitle}>{g.title}</Text>
              <Text style={styles.goalMeta}>
                Status: {g.status.toLowerCase().replace(/_/g, " ")}
              </Text>
              {g.description && (
                <Text style={styles.goalBody}>{g.description}</Text>
              )}
              {g.evidenceSummary && (
                <Text style={styles.goalBody}>
                  <Text style={{ fontWeight: "bold" }}>Evidence: </Text>
                  {g.evidenceSummary}
                </Text>
              )}
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>6. What came up this year</Text>
        {data.escalations.length === 0 ? (
          <Text style={styles.intro}>No escalations recorded.</Text>
        ) : (
          data.escalations.map((e, i) => (
            <View key={i} style={styles.escalation} wrap={false}>
              <View style={styles.escalationHeader}>
                <Text style={{ fontWeight: "bold" }}>
                  {e.type.replace(/_/g, " ").toLowerCase()}
                </Text>
                <Text style={styles.goalMeta}>
                  {formatDate(e.openedAt)}
                  {e.resolvedAt ? ` → ${formatDate(e.resolvedAt)}` : " · open"}
                </Text>
              </View>
              <Text style={styles.goalBody}>{e.description}</Text>
              {e.resolution && (
                <Text style={styles.goalBody}>
                  <Text style={{ fontWeight: "bold" }}>Resolution: </Text>
                  {e.resolution}
                </Text>
              )}
            </View>
          ))
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${participantFullName} · Funding justification · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function renderFundingJustificationPdf(
  data: FundingJustificationData
): Promise<Buffer> {
  return renderToBuffer(<FundingJustificationDoc data={data} />);
}