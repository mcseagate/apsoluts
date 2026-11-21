// Shapes returned by the billing API (server/src/controllers/admin/billing.js).

export type QuoteStatus = "new" | "reviewing" | "converted" | "declined";
export type ProjectStatus = "draft" | "active" | "completed" | "cancelled";
export type InvoiceStatus = "draft" | "unpaid" | "overdue" | "paid" | "void";

export interface Quote {
  id: string;
  name: string;
  email: string;
  requirements: string;
  budget: string;
  status: QuoteStatus;
  adminNote: string;
  projectId: string | null;
  createdAt: string;
}

export interface Milestone {
  id: string;
  label: string;
  kind: "deposit" | "milestone" | "final";
  amount: string; // decimal string, e.g. "400.00"
  amountMinor: number;
  amountDisplay: string;
  dueInDays: number;
  invoice: { id: string; number: string | null; status: string } | null;
}

export interface Project {
  id: string;
  quoteRequestId: string | null;
  clientName: string;
  clientEmail: string;
  title: string;
  scope: string;
  deliverables: string[];
  price: string;
  priceMinor: number;
  priceDisplay: string;
  currency: string;
  timeline: string;
  status: ProjectStatus;
  acceptance: { acceptedAt: string; acceptedBy: string; method: string; reference: string; termsHash: string } | null;
  milestones: Milestone[];
  createdAt: string;
  invoices?: Invoice[];
  history?: HistoryEntry[];
}

export interface HistoryEntry {
  at: string;
  scope?: string;
  action: string;
  actor: string;
  from: string | null;
  to: string | null;
  detail: string;
}

export interface Invoice {
  id: string;
  number: string | null;
  projectId: string;
  milestoneId: string;
  status: InvoiceStatus;
  storedStatus: "draft" | "unpaid" | "paid" | "void";
  clientName: string;
  clientEmail: string;
  projectTitle: string;
  milestoneLabel: string;
  description: string;
  note: string;
  amountDisplay: string;
  currency: string;
  dueDate: string;
  issuedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  voidReason: string;
  replacesInvoiceId: string | null;
  replacedByInvoiceId: string | null;
  lastEmailedAt: string | null;
  linkEnabled: boolean;
  link: string | null;
  refundedDisplay: string | null;
  disputeStatus: string | null;
  flags: { code: string; at: string; detail: string }[];
  payments?: {
    id: string;
    status: string;
    amountDisplay: string;
    sessionId: string | null;
    paymentIntentId: string | null;
    livemode: boolean;
    failureCode: string | null;
    createdAt: string;
    paidAt: string | null;
  }[];
  history?: HistoryEntry[];
}

export type PagedList<K extends string, T> = { total: number; page: number; limit: number; totalPages: number } & {
  [P in K]: T[];
};

export interface BillingStatus {
  currency: string;
  businessDetails: { ready: boolean; missing: string[] };
  invoiceLinks: { ready: boolean };
  payments: { ready: boolean; webhookReady: boolean; mode: "test" | "live" | "unconfigured"; liveBlocked: boolean };
  email: { ready: boolean };
}

// What a client sees at /invoice (server/src/services/invoices.js publicInvoiceView).
export interface PublicInvoice {
  number: string;
  status: InvoiceStatus;
  business: { legalName: string; address: string; email: string; phone: string | null; taxId: string | null; taxNote: string | null };
  clientName: string;
  projectTitle: string;
  milestoneLabel: string;
  description: string;
  note: string | null;
  amountDisplay: string;
  currency: string;
  dueDate: string;
  issuedAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  refundedDisplay: string | null;
  confirmingPayment: boolean;
  canPay: boolean;
}
