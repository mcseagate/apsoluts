import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { PublicInvoice } from "@/types/billing";
import { StatusBadge } from "@/components/admin/shared";

// The client's invoice page. Opened from a private link of the form
// /invoice#<token>. The token is in the URL fragment, which the browser never
// sends to any server, and it goes to the API in a header. Paying happens on
// Stripe's hosted page; this page only starts that and then reports what the
// server has confirmed.

const POLL_MS = 3000;
const POLL_FOR_MS = 2 * 60 * 1000;

type Load = { state: "loading" } | { state: "invalid" } | { state: "error"; message: string } | { state: "ready"; invoice: PublicInvoice };

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-sm text-foreground">{children}</dd>
  </div>
);

export default function Invoice() {
  const [token] = useState(() => window.location.hash.replace(/^#/, ""));
  const [returned] = useState(() => new URLSearchParams(window.location.search).get("checkout"));
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [polling, setPolling] = useState(returned === "success");

  useEffect(() => {
    const previous = document.title;
    document.title = "Invoice | Apex Root Solutions";
    // Keep this page out of search results and stop the link leaking in referrers.
    const tags = [
      ["robots", "noindex, nofollow"],
      ["referrer", "no-referrer"],
    ].map(([name, content]) => {
      const m = document.createElement("meta");
      m.name = name;
      m.content = content;
      document.head.appendChild(m);
      return m;
    });
    return () => {
      document.title = previous;
      tags.forEach((m) => m.remove());
    };
  }, []);

  const fetchInvoice = useCallback(async () => {
    if (!token) return setLoad({ state: "invalid" });
    try {
      const invoice = await api.get<PublicInvoice>("/api/public/invoice", { headers: { "X-Invoice-Token": token } });
      setLoad({ state: "ready", invoice });
      return invoice;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setLoad({ state: "invalid" });
      else setLoad((prev) => (prev.state === "ready" ? prev : { state: "error", message: err instanceof Error ? err.message : "Could not load this invoice." }));
    }
  }, [token]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  // Back from Stripe: the page only says "paid" once the server, having
  // verified Stripe's webhook, says so. Until then, keep asking.
  useEffect(() => {
    if (!polling) return;
    const started = Date.now();
    const id = window.setInterval(async () => {
      const inv = await fetchInvoice();
      if ((inv && inv.status !== "unpaid" && inv.status !== "overdue") || Date.now() - started > POLL_FOR_MS) {
        window.clearInterval(id);
        setPolling(false);
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [polling, fetchInvoice]);

  const pay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const { url } = await api.post<{ url: string }>("/api/public/invoice/checkout", undefined, { headers: { "X-Invoice-Token": token } });
      if (new URL(url).protocol !== "https:") throw new Error("Unexpected payment address.");
      window.location.assign(url);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "We could not start the payment.");
      setPaying(false);
      void fetchInvoice();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60 print:hidden">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to="/" className="font-display text-xl tracking-[0.2em] hover:text-muted-foreground transition-colors">APEX ROOT</Link>
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground"><Lock className="w-3.5 h-3.5" aria-hidden />Private invoice</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        {load.state === "loading" && <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto my-24" aria-label="Loading invoice" />}

        {load.state === "invalid" && (
          <div role="alert" className="border border-border bg-card/30 p-8">
            <h1 className="font-display text-4xl tracking-wide mb-3">INVOICE NOT FOUND</h1>
            <p className="text-sm text-muted-foreground">This link is not valid, or it has been replaced or turned off. Please use the most recent link we sent you, or contact us and we will send a new one.</p>
          </div>
        )}

        {load.state === "error" && (
          <div role="alert" className="border border-border bg-card/30 p-8">
            <h1 className="font-display text-4xl tracking-wide mb-3">COULD NOT LOAD</h1>
            <p className="text-sm text-muted-foreground mb-4">{load.message}</p>
            <button type="button" onClick={() => void fetchInvoice()} className="text-[11px] uppercase tracking-[0.2em] text-accent hover:text-foreground">Try again</button>
          </div>
        )}

        {load.state === "ready" && <InvoiceBody invoice={load.invoice} returned={returned} polling={polling} paying={paying} payError={payError} onPay={pay} />}
      </main>
    </div>
  );
}

function InvoiceBody({ invoice, returned, polling, paying, payError, onPay }: { invoice: PublicInvoice; returned: string | null; polling: boolean; paying: boolean; payError: string | null; onPay: () => void }) {
  const { business: b } = invoice;
  const paid = invoice.status === "paid";
  const isVoid = invoice.status === "void";
  const payable = invoice.canPay && !paid && !isVoid;

  return (
    <article className="space-y-8">
      {paid && (
        <div role="status" className="border border-emerald-500/50 bg-emerald-500/10 p-5 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-medium">Payment received. Thank you.</p>
            <p className="text-sm text-muted-foreground mt-1">This invoice is paid in full{invoice.paidAt ? ` (${new Date(invoice.paidAt).toLocaleDateString()})` : ""}. A record of the payment is kept with {b.legalName}.</p>
          </div>
        </div>
      )}
      {!paid && returned === "success" && (polling || invoice.confirmingPayment) && (
        <div role="status" className="border border-amber-500/50 bg-amber-500/10 p-5 flex gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-medium">We are confirming your payment.</p>
            <p className="text-sm text-muted-foreground mt-1">This page updates by itself as soon as our payment provider confirms it. You do not need to pay again.</p>
          </div>
        </div>
      )}
      {!paid && returned === "success" && !polling && !invoice.confirmingPayment && payable && (
        <div role="status" className="border border-border bg-card/30 p-5 text-sm text-muted-foreground">
          We have not received confirmation yet. If you completed the payment, it can take a few minutes: reload this page shortly. Please do not pay twice.
        </div>
      )}
      {returned === "canceled" && payable && (
        <div role="status" className="border border-border bg-card/30 p-5 text-sm text-muted-foreground">Checkout was canceled and nothing was charged. You can pay whenever you are ready.</div>
      )}
      {isVoid && (
        <div role="status" className="border border-border bg-card/30 p-5">
          <p className="font-medium">This invoice was cancelled.</p>
          <p className="text-sm text-muted-foreground mt-1">It can no longer be paid. If we sent you a replacement, please use that one.</p>
        </div>
      )}
      {invoice.refundedDisplay && (
        <div role="status" className="border border-sky-500/50 bg-sky-500/10 p-5 text-sm">{invoice.refundedDisplay} of this invoice has been refunded.</div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-8">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-2">Invoice</p>
          <h1 className="font-display text-5xl md:text-6xl tracking-wide">{invoice.number}</h1>
        </div>
        <StatusBadge status={invoice.status} />
      </header>

      <section className="grid sm:grid-cols-2 gap-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">From</p>
          <p className="font-medium">{b.legalName}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{b.address}</p>
          <p className="text-sm text-muted-foreground mt-2">{b.email}{b.phone ? ` · ${b.phone}` : ""}</p>
          {b.taxId && <p className="text-sm text-muted-foreground">Tax ID: {b.taxId}</p>}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Billed to</p>
          <p className="font-medium">{invoice.clientName}</p>
        </div>
      </section>

      <section className="border border-border p-6 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{invoice.milestoneLabel}</p>
          <h2 className="text-lg font-medium">{invoice.projectTitle}</h2>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.description}</p>
        {invoice.note && <p className="text-sm whitespace-pre-wrap border-l-2 border-accent pl-3">{invoice.note}</p>}
      </section>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        <Row label="Amount due"><span className="font-display text-3xl tracking-wide">{invoice.amountDisplay}</span> <span className="text-muted-foreground text-xs">{invoice.currency}</span></Row>
        <Row label="Issued">{new Date(invoice.issuedAt).toLocaleDateString()}</Row>
        <Row label="Due">{invoice.dueDate}{invoice.status === "overdue" && <span className="text-accent"> · overdue</span>}</Row>
      </dl>
      {b.taxNote && <p className="text-xs text-muted-foreground whitespace-pre-line">{b.taxNote}</p>}

      {payable && (
        <div className="print:hidden space-y-3">
          <button type="button" onClick={onPay} disabled={paying} className="inline-flex items-center gap-3 bg-accent text-accent-foreground px-10 py-4 text-[12px] uppercase tracking-[0.2em] font-medium hover:bg-accent/90 transition-colors disabled:opacity-60">
            {paying ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Lock className="w-4 h-4" aria-hidden />}
            Pay invoice
          </button>
          <p className="text-xs text-muted-foreground">You will pay on Stripe's secure page. Your card details go to Stripe and never reach us.</p>
          {payError && <p role="alert" className="text-sm text-accent">{payError}</p>}
        </div>
      )}
      {!payable && !paid && !isVoid && invoice.confirmingPayment && (
        <p className="text-sm text-muted-foreground">A payment is being confirmed. You do not need to do anything.</p>
      )}
    </article>
  );
}
