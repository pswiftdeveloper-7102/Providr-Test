import { FileDown } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export default function PayrollExportsPage() {
  return (
    <ComingSoon
      title="Payroll Exports"
      description="Generate payroll-ready CSV exports from approved timesheets. Supports Xero, MYOB, and KeyPay formats."
      icon={FileDown}
    />
  );
}