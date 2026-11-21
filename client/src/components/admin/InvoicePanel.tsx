import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Mail } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { Invoice } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { History, KV, Label, Section, StatusBadge } from "./shared";
import { fmtDate, toastError } from "./utils";

const btn = "rounded-none h-9 px-3 text-[11px] uppercase tracking-[0.15em]";

const FLAG_TEXT: Record<string, string> = {
  duplicate_payment: "A second payment arrived for this invoice. Refund the extra one in Stripe.",
  paid_after_void: "A payment arrived after this invoice was voided. Refund it in Stripe.",
  payment_mismatch: "Stripe reported a payment that did not match this invoice. It was not marked paid. Check Stripe.",
  refunded: "A refund was recorded.",
  disputed: "A card dispute was opened. Respond to it in the Stripe dashboard.",
};

// Everything an administrator can do with one invoice. Which buttons show
// follows the invoice's state; the server enforces the same rules.
export default function InvoicePanel({ invoiceId, onChanged }: { invoiceId: string; onChanged?: () => void }) {
  const qc = useQueryClient();
  const key = ["admin-invoice", invoiceId];
  const { data: inv, isLoading } = useQuery({ queryKey: key, queryFn: () => adminApi.get<Invoice>(`/api/admin/invoices/${invoiceId}`) });
  const [reason, setReason] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const done = (message: string) => {
    toast.success(message);
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    qc.invalidateQueries({ queryKey: ["admin-project"] });
    onChanged?.();
  };

  const issue = useMutation({ mutationFn: () => adminApi.post(`/api/admin/invoices/${invoiceId}/issue`), onSuccess: () => done("Invoice issued"), onError: toastError });
  const del = useMutation({ mutationFn: () => adminApi.delete(`/api/admin/invoices/${invoiceId}`), onSuccess: () => done("Draft deleted"), onError: toastError });
  const voidIt = useMutation({ mutationFn: () => adminApi.post(`/api/admin/invoices/${invoiceId}/void`, { reason }), onSuccess: () => { setReason(""); done("Invoice voided"); }, onError: toastError });
  const reissue = useMutation({
    mutationFn: () => adminApi.post(`/api/admin/invoices/${invoiceId}/reissue`, { reason, ...(dueDate ? { dueDate } : {}), ...(note ? { note } : {}) }),
    onSuccess: () => { setReason(""); done("Voided and a replacement draft created"); },
    onError: toastError,
  });
  const send = useMutation({ mutationFn: () => adminApi.post(`/api/admin/invoices/${invoiceId}/send`), onSuccess: () => done("Invoice emailed to the client"), onError: toastError });
  const rotate = useMutation({ mutationFn: () => adminApi.post(`/api/admin/invoices/${invoiceId}/link/rotate`), onSuccess: () => done("New link created; earlier links stopped working"), onError: toastError });
  const disable = useMutation({ mutationFn: () => adminApi.post(`/api/admin/invoices/${invoiceId}/link/disable`), onSuccess: () => done("Client link disabled"), onError: toastError });
  const patch = useMutation({
    mutationFn: () => adminApi.patch(`/api/admin/invoices/${invoiceId}`, { ...(dueDate ? { dueDate } : {}), ...(inv?.storedStatus === "draft" && note ? { note } : {}) }),
    onSuccess: () => done("Saved"),
    onError: toastError,
  });

  if (isLoading || !inv) return <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto my-16" />;

  const copy = async () => {
    if (!inv.link) return;
    try {
      await navigator.clipboard.writeText(inv.link);
      toast.success("Invoice link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  };

  const issued = inv.storedStatus === "unpaid";
  const draft = inv.storedStatus === "draft";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-3xl tracking-wide">{inv.number ?? "Draft invoice"}</h2>
        <StatusBadge status={inv.status} />
        {inv.refundedDisplay && <StatusBadge status="refunded" />}
      </div>

      {inv.flags.filter((f) => f.code !== "refunded").map((f) => (
        <div key={f.code} role="alert" className="border border-accent bg-accent/10 p-3 text-sm">
          <strong className="uppercase tracking-[0.15em] text-[11px]">{f.code.replace(/_/g, " ")}</strong>
          <p className="mt-1 text-muted-foreground">{FLAG_TEXT[f.code] ?? f.detail}</p>
        </div>
      ))}

      <Section title="Invoice">
        <div className="grid grid-cols-2 gap-4">
          <KV k="Amount">{inv.amountDisplay} {inv.currency}</KV>
          <KV k="Due">{inv.dueDate}</KV>
          <KV k="Client">{inv.clientName}<br /><span className="text-muted-foreground">{inv.clientEmail}</span></KV>
          <KV k="Milestone">{inv.milestoneLabel}</KV>
          <KV k="Issued">{fmtDate(inv.issuedAt)}</KV>
          <KV k="Paid">{fmtDate(inv.paidAt)}</KV>
          {inv.refundedDisplay && <KV k="Refunded">{inv.refundedDisplay}</KV>}
          {inv.status === "void" && <KV k="Void reason">{inv.voidReason}</KV>}
        </div>
        <KV k="Description"><span className="whitespace-pre-wrap">{inv.description}</span></KV>
        {inv.note && <KV k="Note"><span className="whitespace-pre-wrap">{inv.note}</span></KV>}
        <p className="text-xs text-muted-foreground">The amount and description are fixed once the invoice is issued. To correct either, void it and issue a replacement.</p>
      </Section>

      {(issued || inv.status === "paid" || inv.status === "void") && (
        <Section title="Client link">
          {inv.link ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={inv.link} onFocus={(e) => e.currentTarget.select()} className="rounded-none h-9 text-xs font-mono" aria-label="Invoice link" />
                <Button type="button" variant="outline" onClick={copy} className={btn}><Copy className="w-3.5 h-3.5 mr-2" />Copy</Button>
                <Button asChild variant="outline" className={btn}><a href={inv.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /><span className="sr-only">Open as the client</span></a></Button>
              </div>
              <p className="text-xs text-muted-foreground">Anyone with this link can view and pay this one invoice. {inv.lastEmailedAt ? `Last emailed ${fmtDate(inv.lastEmailedAt)}.` : "Not emailed yet."}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">The client link is disabled. Create a new link to turn it back on.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {issued && inv.linkEnabled && (
              <Button type="button" onClick={() => send.mutate()} disabled={send.isPending} className={`${btn} bg-accent text-accent-foreground hover:bg-accent/90`}>
                {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Mail className="w-3.5 h-3.5 mr-2" />Email to client</>}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => { if (window.confirm("Create a new link? Every earlier link stops working.")) rotate.mutate(); }} className={btn}>New link</Button>
            {inv.linkEnabled && <Button type="button" variant="outline" onClick={() => { if (window.confirm("Disable the client link? The client will no longer be able to open this invoice.")) disable.mutate(); }} className={btn}>Disable link</Button>}
          </div>
        </Section>
      )}

      {(draft || issued) && (
        <Section title={draft ? "Draft" : "Change due date"}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1"><Label>Due date</Label><Input type="date" defaultValue={inv.dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-none h-9 w-44" /></label>
            {draft && <label className="space-y-1 flex-1 min-w-48"><Label>Note to client</Label><Input defaultValue={inv.note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="rounded-none h-9" /></label>}
            <Button type="button" variant="outline" disabled={patch.isPending || (!dueDate && !note)} onClick={() => patch.mutate()} className={btn}>Save</Button>
          </div>
          {draft && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => issue.mutate()} disabled={issue.isPending} className={`${btn} bg-accent text-accent-foreground hover:bg-accent/90`}>
                {issue.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Issue invoice"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { if (window.confirm("Delete this draft?")) del.mutate(); }} className={btn}>Delete draft</Button>
            </div>
          )}
          {draft && <p className="text-xs text-muted-foreground">Issuing assigns the invoice number and locks the amount, description and your business details as they are now.</p>}
        </Section>
      )}

      {issued && (
        <Section title="Void or correct">
          <label className="space-y-1 block"><Label>Reason (kept on the record)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="rounded-none h-9" /></label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={reason.trim().length < 3 || voidIt.isPending} onClick={() => { if (window.confirm("Void this invoice? The client will no longer be able to pay it.")) voidIt.mutate(); }} className={btn}>Void</Button>
            <Button type="button" variant="outline" disabled={reason.trim().length < 3 || reissue.isPending} onClick={() => { if (window.confirm("Void this invoice and create a replacement draft?")) reissue.mutate(); }} className={btn}>Void &amp; reissue</Button>
          </div>
          <p className="text-xs text-muted-foreground">Voiding closes any open checkout. A paid invoice cannot be voided: refund it in Stripe.</p>
        </Section>
      )}

      {!!inv.payments?.length && (
        <Section title="Payments">
          <ul className="space-y-2 text-xs">
            {inv.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l border-border pl-3">
                <StatusBadge status={p.status} />
                <span>{p.amountDisplay}</span>
                <span className="text-muted-foreground">{p.livemode ? "live" : "test"}</span>
                {p.paymentIntentId && <span className="font-mono text-muted-foreground">{p.paymentIntentId}</span>}
                {p.failureCode && <span className="text-muted-foreground">{p.failureCode}</span>}
                <span className="text-muted-foreground">{fmtDate(p.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="History"><History entries={inv.history ?? []} /></Section>
    </div>
  );
}
