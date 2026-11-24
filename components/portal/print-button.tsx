"use client";

import { Printer } from "@/components/icons";

export function PrintButton() {
  return <button type="button" className="portal-btn portal-btn--primary portal-btn--sm" onClick={() => window.print()}><Printer size={16} /> Print or save as PDF</button>;
}
