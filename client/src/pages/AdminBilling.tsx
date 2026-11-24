import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, LogOut } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { BillingStatus } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminGate from "@/components/admin/AdminGate";
import InvoicePanel from "@/components/admin/InvoicePanel";
import ProjectPanel from "@/components/admin/ProjectPanel";
import { InvoicesList, ProjectsList, QuotesList } from "@/components/admin/BillingLists";

// What still has to be set on the server before invoices and payments work.
function SetupStatus() {
  const { data } = useQuery({ queryKey: ["admin-billing-status"], queryFn: () => adminApi.get<BillingStatus>("/api/admin/billing/status") });
  if (!data) return null;
  const items: { ok: boolean; text: string }[] = [
    { ok: data.businessDetails.ready, text: data.businessDetails.ready ? "Business details set" : `Missing on the server: ${data.businessDetails.missing.join(", ")}. Invoices cannot be issued until these are set.` },
    { ok: data.invoiceLinks.ready, text: data.invoiceLinks.ready ? "Client links ready" : "INVOICE_LINK_SECRET is not set (32+ characters). Invoices cannot be issued." },
    {
      ok: data.payments.ready && data.payments.webhookReady,
      text: data.payments.liveBlocked
        ? "A live Stripe key is set but live payments are not enabled (STRIPE_ENABLE_LIVE). Payments are off."
        : !data.payments.ready
          ? "Stripe is not configured (STRIPE_SECRET_KEY). Clients cannot pay online yet."
          : !data.payments.webhookReady
            ? "STRIPE_WEBHOOK_SECRET is not set. Payments would not be confirmed."
            : `Stripe ready in ${data.payments.mode.toUpperCase()} mode`,
    },
    { ok: data.email.ready, text: data.email.ready ? "Email ready" : "No email service configured: invoices cannot be emailed and admin alerts are not delivered." },
  ];
  if (items.every((i) => i.ok) && data.payments.mode === "test") {
    return <p className="text-xs text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" />Setup complete · Stripe is in TEST mode · currency {data.currency}</p>;
  }
  return (
    <ul className="border border-border bg-card/20 p-4 space-y-2 text-sm" aria-label="Setup status">
      {items.map((i) => (
        <li key={i.text} className="flex items-start gap-2">
          {i.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 text-accent shrink-0" />}
          <span className={i.ok ? "text-muted-foreground" : "text-foreground"}>{i.text}</span>
        </li>
      ))}
      <li className="text-xs text-muted-foreground">Billing currency {data.currency}. See docs/INVOICING.md for setup.</li>
    </ul>
  );
}

export default function AdminBilling() {
  const [tab, setTab] = useState("requests");
  const [panel, setPanel] = useState<{ kind: "project" | "invoice"; id: string } | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = "Billing | Apex Root Solutions";
    return () => { document.title = previous; };
  }, []);

  return (
    <AdminGate>
      {(signOut) => (
        <div className="min-h-screen bg-background text-foreground">
          <header className="border-b border-border/80 bg-card/30 backdrop-blur-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <Link to="/" className="font-display text-xl tracking-[0.2em]">APEX ROOT</Link>
                <nav className="flex items-center gap-4 text-[11px] uppercase tracking-[0.2em]" aria-label="Admin">
                  <span className="text-foreground border-b border-accent pb-1">Billing</span>
                  <Link to="/admin/subscribers" className="text-muted-foreground hover:text-foreground transition-colors">Subscribers</Link>
                  <Link to="/admin/campaigns" className="text-muted-foreground hover:text-foreground transition-colors">Campaigns</Link>
                </nav>
              </div>
              <Button onClick={signOut} variant="outline" className="rounded-none h-10 px-4 text-xs tracking-wider uppercase gap-2"><LogOut className="w-3.5 h-3.5" /> Logout</Button>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            <div>
              <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3">Admin</p>
              <h1 className="font-display text-5xl md:text-6xl tracking-wide">BILLING</h1>
            </div>
            <SetupStatus />

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="rounded-none">
                <TabsTrigger value="requests" className="rounded-none">Requests</TabsTrigger>
                <TabsTrigger value="projects" className="rounded-none">Projects</TabsTrigger>
                <TabsTrigger value="invoices" className="rounded-none">Invoices</TabsTrigger>
              </TabsList>
              <TabsContent value="requests" className="mt-6">
                <QuotesList onOpenProject={(id) => { setTab("projects"); setPanel({ kind: "project", id }); }} />
              </TabsContent>
              <TabsContent value="projects" className="mt-6"><ProjectsList onOpen={(id) => setPanel({ kind: "project", id })} /></TabsContent>
              <TabsContent value="invoices" className="mt-6"><InvoicesList onOpen={(id) => setPanel({ kind: "invoice", id })} /></TabsContent>
            </Tabs>
          </main>

          <Sheet open={Boolean(panel)} onOpenChange={(o) => !o && setPanel(null)}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-background">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-[11px] uppercase tracking-[0.25em]">{panel?.kind === "invoice" ? "Invoice" : "Project"}</SheetTitle>
                <SheetDescription className="sr-only">Details and actions</SheetDescription>
              </SheetHeader>
              {panel?.kind === "project" && <ProjectPanel projectId={panel.id} onOpenInvoice={(id) => setPanel({ kind: "invoice", id })} />}
              {panel?.kind === "invoice" && <InvoicePanel invoiceId={panel.id} />}
            </SheetContent>
          </Sheet>
        </div>
      )}
    </AdminGate>
  );
}
