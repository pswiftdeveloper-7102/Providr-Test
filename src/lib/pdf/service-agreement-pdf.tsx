// Server-side PDF template for NDIS service agreements (Q7).
// Rendered through @react-pdf/renderer — runs in Node, never in the
// browser. Per the Q7 memory the template lives in code for v1; a per-org
// or CMS-driven override comes later.
//
// Renders the metadata we have today (participant, org, agreement dates,
// signing dates, free-text notes/services). Pricing-per-line-item against
// the NDIS price guide is out of scope until we have that data structured
// on ServiceAgreement.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { renderToBuffer } from "./renderer";

type Money = number | null | undefined;

export type ServiceAgreementPdfData = {
  org: {
    legalName: string;
    tradingName: string | null;
    abn: string | null;
    ndisRegistrationNumber: string | null;
  };
  participant: {
    firstName: string;
    lastName: string;
    ndisNumber: string | null;
    address: string | null;
    dateOfBirth: Date | null;
    pronouns: string | null;
  };
  agreement: {
    startDate: Date;
    endDate: Date | null;
    signedAt: Date | null;
    notes: string | null;
  };
  generatedAt: Date;
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: "#1f2937",
    lineHeight: 1.5,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 12,
    marginBottom: 18,
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
    marginTop: 6,
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
    marginTop: 18,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  rowLabel: {
    width: 140,
    color: "#6b7280",
  },
  rowValue: {
    flex: 1,
    color: "#111827",
  },
  body: {
    color: "#1f2937",
    marginTop: 6,
    whiteSpace: "pre-wrap",
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 10,
    color: "#6b7280",
  },
  bulletText: {
    flex: 1,
  },
  signaturesWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    gap: 24,
  },
  sigBlock: {
    flex: 1,
  },
  sigLine: {
    marginTop: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
  },
  sigLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Defer to keep TS happy in shared scope when we wire pricing later.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatMoney(_cents: Money): string {
  return "—";
}

function ServiceAgreementDoc({ data }: { data: ServiceAgreementPdfData }) {
  const providerName = data.org.tradingName ?? data.org.legalName;
  const participantFullName = `${data.participant.firstName} ${data.participant.lastName}`;
  const services = (data.agreement.notes ?? "").trim();

  return (
    <Document
      title={`Service Agreement — ${participantFullName}`}
      author={data.org.legalName}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{providerName}</Text>
          <Text style={styles.title}>NDIS Service Agreement</Text>
          <Text style={styles.subhead}>
            Between {data.org.legalName} (Provider) and {participantFullName}{" "}
            (Participant)
          </Text>
        </View>

        <Text style={styles.sectionTitle}>1. Parties</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Provider</Text>
          <Text style={styles.rowValue}>
            {data.org.legalName}
            {data.org.tradingName ? ` (trading as ${data.org.tradingName})` : ""}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>ABN</Text>
          <Text style={styles.rowValue}>{data.org.abn ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>NDIS registration</Text>
          <Text style={styles.rowValue}>
            {data.org.ndisRegistrationNumber ?? "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Participant</Text>
          <Text style={styles.rowValue}>
            {participantFullName}
            {data.participant.pronouns ? ` (${data.participant.pronouns})` : ""}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>NDIS number</Text>
          <Text style={styles.rowValue}>
            {data.participant.ndisNumber ?? "—"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Date of birth</Text>
          <Text style={styles.rowValue}>
            {formatDateShort(data.participant.dateOfBirth)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Address</Text>
          <Text style={styles.rowValue}>
            {data.participant.address ?? "—"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>2. Term</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Start date</Text>
          <Text style={styles.rowValue}>
            {formatDate(data.agreement.startDate)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>End date</Text>
          <Text style={styles.rowValue}>
            {data.agreement.endDate
              ? formatDate(data.agreement.endDate)
              : "Open-ended (aligned to the participant's NDIS plan)"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>3. Services agreed</Text>
        {services ? (
          <Text style={styles.body}>{services}</Text>
        ) : (
          <Text style={styles.body}>
            The Provider will deliver the supports listed in the
            Participant&apos;s NDIS plan and care plan, as agreed between the
            parties. Detailed services, hours and pricing are documented in
            the Participant&apos;s care plan and itemised in service bookings
            and invoices.
          </Text>
        )}

        <Text style={styles.sectionTitle}>4. Responsibilities</Text>
        <View style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            The Provider will deliver services with reasonable care and skill,
            in line with the NDIS Code of Conduct and Practice Standards.
          </Text>
        </View>
        <View style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            The Provider will give 24 hours&apos; notice of any change to a
            scheduled support, where reasonably possible.
          </Text>
        </View>
        <View style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            The Participant will treat the Provider&apos;s staff with respect
            and provide a safe working environment.
          </Text>
        </View>
        <View style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            The Participant will give 24 hours&apos; notice for cancellations
            where reasonably possible; short-notice cancellations may be
            charged in line with the NDIS Pricing Arrangements.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>5. Payments</Text>
        <Text style={styles.body}>
          Supports will be claimed against the Participant&apos;s NDIS plan in
          line with the NDIS Pricing Arrangements and Price Limits applicable
          on the date of service.
        </Text>

        <Text style={styles.sectionTitle}>6. Ending this agreement</Text>
        <Text style={styles.body}>
          Either party may end this agreement by giving 14 days&apos; written
          notice. If either party seriously breaches this agreement, the other
          party does not have to give notice.
        </Text>

        <Text style={styles.sectionTitle}>7. Feedback &amp; complaints</Text>
        <Text style={styles.body}>
          If the Participant wishes to give feedback or make a complaint, they
          can contact the Provider directly, or the NDIS Quality and
          Safeguards Commission on 1800 035 544.
        </Text>

        <View style={styles.signaturesWrap}>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLine}> </Text>
            <Text style={styles.sigLabel}>Participant signature</Text>
            <Text style={styles.sigLabel}>
              Date signed:{" "}
              {data.agreement.signedAt
                ? formatDateShort(data.agreement.signedAt)
                : "____ / ____ / ________"}
            </Text>
          </View>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLine}> </Text>
            <Text style={styles.sigLabel}>
              Provider representative ({data.org.legalName})
            </Text>
            <Text style={styles.sigLabel}>
              Date signed: ____ / ____ / ________
            </Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Generated ${formatDateShort(data.generatedAt)} · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export async function renderServiceAgreementPdf(
  data: ServiceAgreementPdfData
): Promise<Buffer> {
  return renderToBuffer(<ServiceAgreementDoc data={data} />);
}