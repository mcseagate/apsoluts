import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { Project } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { History, KV, Label, Section, StatusBadge } from "./shared";
import { MONEY_PATTERN, fmtDate, toastError } from "./utils";

const btn = "rounded-none h-9 px-3 text-[11px] uppercase tracking-[0.15em]";

interface MilestoneDraft {
  label: string;
  kind: "deposit" | "milestone" | "final";
  amount: string;
  dueInDays: string;
}

interface Terms {
  clientName: string;
  clientEmail: string;
  title: string;
  scope: string;
  deliverables: string;
  price: string;
  timeline: string;
  milestones: MilestoneDraft[];
}

const toTerms = (p: Project): Terms => ({
  clientName: p.clientName,
  clientEmail: p.clientEmail,
  title: p.title,
  scope: p.scope,
  deliverables: p.deliverables.join("\n"),
  price: p.price === "0.00" ? "" : p.price,
  timeline: p.timeline,
  milestones: p.milestones.map((m) => ({ label: m.label, kind: m.kind, amount: m.amount, dueInDays: String(m.dueInDays) })),
});

const field = "rounded-none h-9";

// Whole cents from a typed amount, or NaN. Plain integer arithmetic, no floats.
const toCents = (s: string) => {
  if (!MONEY_PATTERN.test(s)) return NaN;
  const [whole, frac = ""] = s.split(".");
  return Number(whole + frac.padEnd(2, "0"));
};

// The quote came with a holiday offer. It changes no amount by itself: this shows
// what the offer comes to for a list price and lets the admin put that in the price.
function OfferNote({ offer, locked, onUse }: { offer: NonNullable<Project["offer"]>; locked: boolean; onUse: (price: string) => void }) {
  const [list, setList] = useState("");
  const cents = toCents(list);
  const discounted = Number.isFinite(cents) ? Math.floor((cents * (100 - offer.percent) + 50) / 100) : NaN;
  const text = (c: number) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`;
  return (
    <div className="border border-accent bg-accent/10 p-4 space-y-3 text-sm">
      <p>
        <strong>Offer {offer.code}</strong>: {offer.percent}% off the whole project price ({offer.holiday}, valid through {offer.validThrough}). Honour it when you set the price, and write it into the Project Agreement.
      </p>
      {!locked && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <Label>List price before the offer</Label>
            <Input inputMode="decimal" placeholder="1500.00" value={list} onChange={(e) => setList(e.target.value)} className="rounded-none h-9 w-40" />
          </label>
          <p className="pb-2 text-xs text-muted-foreground">{Number.isFinite(discounted) ? `With ${offer.percent}% off: ${text(discounted)}` : "Enter an amount like 1500.00"}</p>
          <Button type="button" variant="outline" disabled={!Number.isFinite(discounted)} onClick={() => onUse(text(discounted))} className={btn}>Use as total price</Button>
        </div>
      )}
    </div>
  );
}

export default function ProjectPanel({ projectId, onOpenInvoice }: { projectId: string; onOpenInvoice: (id: string) => void }) {
  const qc = useQueryClient();
  const key = ["admin-project", projectId];
  const { data: project, isLoading } = useQuery({ queryKey: key, queryFn: () => adminApi.get<Project>(`/api/admin/projects/${projectId}`) });
  const [terms, setTerms] = useState<Terms | null>(null);
  const [acc, setAcc] = useState({ acceptedBy: "", method: "email", reference: "", acceptedAt: "" });

  useEffect(() => {
    if (project) {
      setTerms(toTerms(project));
      setAcc((a) => ({ ...a, acceptedBy: a.acceptedBy || project.clientName }));
    }
  }, [project]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
  };

  const save = useMutation({
    mutationFn: (t: Terms) =>
      adminApi.patch(`/api/admin/projects/${projectId}`, {
        clientName: t.clientName,
        clientEmail: t.clientEmail,
        title: t.title,
        scope: t.scope,
        timeline: t.timeline,
        deliverables: t.deliverables.split("\n").map((d) => d.trim()).filter(Boolean),
        ...(t.price ? { price: t.price } : {}),
        milestones: t.milestones.map((m) => ({ label: m.label, kind: m.kind, amount: m.amount, dueInDays: Number(m.dueInDays) })),
      }),
    onSuccess: () => { toast.success("Project saved"); refresh(); },
    onError: toastError,
  });
  const accept = useMutation({
    mutationFn: () => adminApi.post(`/api/admin/projects/${projectId}/accept`, { acceptedBy: acc.acceptedBy, method: acc.method, reference: acc.reference, ...(acc.acceptedAt ? { acceptedAt: acc.acceptedAt } : {}) }),
    onSuccess: () => { toast.success("Acceptance recorded"); refresh(); },
    onError: toastError,
  });
  const unaccept = useMutation({
    mutationFn: () => adminApi.delete(`/api/admin/projects/${projectId}/accept`),
    onSuccess: () => { toast.success("Acceptance withdrawn"); refresh(); },
    onError: toastError,
  });
  const close = useMutation({
    mutationFn: (status: "completed" | "cancelled") => adminApi.post(`/api/admin/projects/${projectId}/close`, { status }),
    onSuccess: () => { toast.success("Project closed"); refresh(); },
    onError: toastError,
  });
  const draftInvoice = useMutation({
    mutationFn: (milestoneId: string) => adminApi.post<{ id: string }>(`/api/admin/projects/${projectId}/invoices`, { milestoneId }),
    onSuccess: (inv) => { toast.success("Draft invoice created"); refresh(); onOpenInvoice(inv.id); },
    onError: toastError,
  });

  if (isLoading || !project || !terms) return <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto my-16" />;

  const locked = Boolean(project.acceptance) || project.status !== "draft";
  const set = <K extends keyof Terms>(k: K, v: Terms[K]) => setTerms({ ...terms, [k]: v });
  const setMs = (i: number, patch: Partial<MilestoneDraft>) => set("milestones", terms.milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  // A running total in whole cents, from the digits typed: no floating point.
  const cents = (s: string) => {
    if (!MONEY_PATTERN.test(s)) return NaN;
    const [whole, frac = ""] = s.split(".");
    return Number(whole + frac.padEnd(2, "0"));
  };
  const sum = terms.milestones.reduce((n, m) => n + (cents(m.amount) || 0), 0);
  const price = cents(terms.price);
  const money = (c: number) => `${Math.floor(c / 100).toLocaleString()}.${String(c % 100).padStart(2, "0")}`;
  const balanced = Number.isFinite(price) && price === sum && sum > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-3xl tracking-wide">{project.title}</h2>
        <StatusBadge status={project.status} />
      </div>

      {project.offer && <OfferNote offer={project.offer} locked={locked} onUse={(price) => set("price", price)} />}

      <Section title="Scope, price and timeline">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1"><Label>Client name</Label><Input disabled={locked} value={terms.clientName} onChange={(e) => set("clientName", e.target.value)} className={field} /></label>
          <label className="space-y-1"><Label>Client email</Label><Input disabled={locked} type="email" value={terms.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} className={field} /></label>
          <label className="space-y-1 sm:col-span-2"><Label>Project title</Label><Input disabled={locked} value={terms.title} onChange={(e) => set("title", e.target.value)} maxLength={120} className={field} /></label>
        </div>
        <label className="space-y-1 block"><Label>Scope</Label><Textarea disabled={locked} value={terms.scope} onChange={(e) => set("scope", e.target.value)} rows={5} className="rounded-none" /></label>
        <label className="space-y-1 block"><Label>Deliverables (one per line)</Label><Textarea disabled={locked} value={terms.deliverables} onChange={(e) => set("deliverables", e.target.value)} rows={3} className="rounded-none" /></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1"><Label>Total price ({project.currency})</Label><Input disabled={locked} inputMode="decimal" placeholder="1500.00" value={terms.price} onChange={(e) => set("price", e.target.value)} className={field} /></label>
          <label className="space-y-1"><Label>Timeline</Label><Input disabled={locked} value={terms.timeline} onChange={(e) => set("timeline", e.target.value)} placeholder="8 weeks from deposit" className={field} /></label>
        </div>

        <div className="space-y-2">
          <Label>Payment milestones</Label>
          {terms.milestones.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_7rem_5rem_auto] gap-2 items-center">
              <Input disabled={locked} aria-label={`Milestone ${i + 1} label`} value={m.label} onChange={(e) => setMs(i, { label: e.target.value })} placeholder="Deposit" className={field} />
              <select disabled={locked} aria-label={`Milestone ${i + 1} type`} value={m.kind} onChange={(e) => setMs(i, { kind: e.target.value as MilestoneDraft["kind"] })} className="h-9 border border-input bg-background px-2 text-sm rounded-none">
                <option value="deposit">Deposit</option><option value="milestone">Milestone</option><option value="final">Final</option>
              </select>
              <Input disabled={locked} aria-label={`Milestone ${i + 1} amount`} inputMode="decimal" value={m.amount} onChange={(e) => setMs(i, { amount: e.target.value })} placeholder="0.00" className={field} />
              <Input disabled={locked} aria-label={`Milestone ${i + 1} days until due`} inputMode="numeric" value={m.dueInDays} onChange={(e) => setMs(i, { dueInDays: e.target.value })} className={field} title="Days after issue until due" />
              {!locked && <Button type="button" variant="ghost" aria-label={`Remove milestone ${i + 1}`} onClick={() => set("milestones", terms.milestones.filter((_, j) => j !== i))} className="h-9 w-9 p-0"><Trash2 className="w-4 h-4" /></Button>}
            </div>
          ))}
          {!locked && (
            <Button type="button" variant="outline" onClick={() => set("milestones", [...terms.milestones, { label: "", kind: "milestone", amount: "", dueInDays: "14" }])} className={btn}><Plus className="w-3.5 h-3.5 mr-2" />Add milestone</Button>
          )}
          <p className={`text-xs ${balanced || locked ? "text-muted-foreground" : "text-accent"}`}>
            Milestones total {money(sum)} · price {Number.isFinite(price) ? money(price) : "not set"}{balanced ? " · balanced" : " · must match to record acceptance"}
          </p>
        </div>
        {!locked && <Button type="button" onClick={() => save.mutate(terms)} disabled={save.isPending} className={`${btn} bg-accent text-accent-foreground hover:bg-accent/90`}>{save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save project"}</Button>}
        {locked && <p className="text-xs text-muted-foreground">These terms are locked because the client has accepted them.</p>}
      </Section>

      <Section title="Client acceptance">
        {project.acceptance ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <KV k="Accepted by">{project.acceptance.acceptedBy}</KV>
              <KV k="Accepted on">{fmtDate(project.acceptance.acceptedAt)}</KV>
              <KV k="How">{project.acceptance.method.replace(/_/g, " ")}</KV>
              <KV k="Reference">{project.acceptance.reference || "—"}</KV>
            </div>
            <p className="text-xs text-muted-foreground break-all">Terms fingerprint (SHA-256): {project.acceptance.termsHash}</p>
            {project.status === "active" && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className={btn} onClick={() => { if (window.confirm("Mark this project completed?")) close.mutate("completed"); }}>Mark completed</Button>
                <Button type="button" variant="outline" className={btn} onClick={() => { if (window.confirm("Withdraw the acceptance? Only possible while no invoices exist.")) unaccept.mutate(); }}>Withdraw acceptance</Button>
                <Button type="button" variant="outline" className={btn} onClick={() => { if (window.confirm("Cancel this project?")) close.mutate("cancelled"); }}>Cancel project</Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Record that the client agreed to this scope, price and timeline (for example by email reply or a signed document). Invoices can only be created after this. Save the project first if you changed anything.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1"><Label>Accepted by</Label><Input value={acc.acceptedBy} onChange={(e) => setAcc({ ...acc, acceptedBy: e.target.value })} className={field} /></label>
              <label className="space-y-1"><Label>How</Label>
                <select value={acc.method} onChange={(e) => setAcc({ ...acc, method: e.target.value })} className="h-9 w-full border border-input bg-background px-2 text-sm rounded-none">
                  <option value="email">Email</option><option value="signed_document">Signed document</option><option value="verbal">Verbal</option><option value="other">Other</option>
                </select>
              </label>
              <label className="space-y-1"><Label>Date accepted (blank = today)</Label><Input type="date" value={acc.acceptedAt} onChange={(e) => setAcc({ ...acc, acceptedAt: e.target.value })} className={field} /></label>
              <label className="space-y-1"><Label>Reference</Label><Input value={acc.reference} onChange={(e) => setAcc({ ...acc, reference: e.target.value })} placeholder="Email of 2 Jan, contract no." maxLength={300} className={field} /></label>
            </div>
            <Button type="button" onClick={() => accept.mutate()} disabled={accept.isPending || !acc.acceptedBy} className={`${btn} bg-accent text-accent-foreground hover:bg-accent/90`}>{accept.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Record acceptance"}</Button>
          </>
        )}
      </Section>

      {project.acceptance && (
        <Section title="Invoices">
          <ul className="divide-y divide-border">
            {project.milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm">{m.label} <span className="text-muted-foreground">· {m.kind}</span></div>
                  <div className="text-xs text-muted-foreground">{m.amountDisplay}</div>
                </div>
                <div className="flex items-center gap-3">
                  {m.invoice ? (
                    <>
                      <StatusBadge status={m.invoice.status} />
                      <Button type="button" variant="outline" className={btn} onClick={() => onOpenInvoice(m.invoice!.id)}>{m.invoice.number ?? "Open draft"}</Button>
                    </>
                  ) : null}
                  {(!m.invoice || m.invoice.status === "void") && (
                    <Button type="button" variant="outline" disabled={draftInvoice.isPending} className={btn} onClick={() => draftInvoice.mutate(m.id)}>Create invoice</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="History"><History entries={project.history ?? []} /></Section>
    </div>
  );
}
