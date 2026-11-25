import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Loader2, LogOut, Send } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminGate from "@/components/admin/AdminGate";
import { KV, Section, StatusBadge } from "@/components/admin/shared";
import { toastError } from "@/components/admin/utils";

interface Offer { code: string; holiday: string; percent: number; opens: string; validThrough: string }
interface Status {
  enabled: boolean;
  ready: { linkSecret: boolean; mail: boolean };
  schedule: { sendHourUtc: number; windowDays: number; dailyDays: number; regularEveryDays: number };
  discount: { percent: number; maxPercent: number };
  today: { date: string; kind: "regular" | "holiday"; due: boolean; offer: Offer | null; alreadySentToday: boolean };
  nextHoliday: { name: string; observed: string } | null;
  subscribers: { active: number; pending: number; unsubscribed: number };
  lastCampaign: { key: string; kind: string; topic: string; subject: string; status: string; counts: { sent: number; failed: number } } | null;
}
interface Preview { date: string; subject: string; html: string; text: string; topic: string; offerCode: string | null }
interface History {
  campaigns: { key: string; sequence: number; kind: string; topic: string; offerCode: string | null; subject: string; status: string; counts: { sent: number; failed: number } }[];
}

const btn = "rounded-none h-9 px-3 text-[11px] uppercase tracking-[0.15em]";

function Content() {
  const [date, setDate] = useState("");
  const status = useQuery({ queryKey: ["admin-campaign-status"], queryFn: () => adminApi.get<Status>("/api/admin/campaigns/status") });
  const history = useQuery({ queryKey: ["admin-campaign-history"], queryFn: () => adminApi.get<History>("/api/admin/campaigns/history") });
  const preview = useQuery({
    queryKey: ["admin-campaign-preview", date],
    queryFn: () => adminApi.get<Preview>(`/api/admin/campaigns/preview${date ? `?date=${date}` : ""}`),
  });
  const testSend = useMutation({
    mutationFn: () => adminApi.post<{ to: string }>("/api/admin/campaigns/test-send"),
    onSuccess: (r) => toast.success(`Test email sent to ${r.to}`),
    onError: toastError,
  });

  const s = status.data;
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div>
        <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3">Admin</p>
        <h1 className="font-display text-5xl md:text-6xl tracking-wide">CAMPAIGNS</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Scheduled emails to subscribers: one about every {s?.schedule.regularEveryDays ?? 3} days. A {s?.discount.percent ?? 10}% holiday offer opens {s?.schedule.windowDays ?? 7} days before each US federal holiday, with daily emails only for the last {s?.schedule.dailyDays ?? 3} days.
        </p>
      </div>

      {s && (
        <ul className="border border-border bg-card/20 p-4 space-y-2 text-sm" aria-label="Campaign status">
          <li className="flex items-start gap-2">
            {s.enabled ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 text-accent shrink-0" />}
            <span>{s.enabled ? `Scheduled sending is ON. Emails go out from ${s.schedule.sendHourUtc}:00 UTC.` : "Scheduled sending is OFF. Nothing is sent to subscribers until CAMPAIGN_EMAILS_ENABLED=true is set on the server."}</span>
          </li>
          {!s.ready.linkSecret && <li className="flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 text-accent shrink-0" />INVOICE_LINK_SECRET is not set, so unsubscribe links cannot be made and nothing will send.</li>}
          {!s.ready.mail && <li className="flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 text-accent shrink-0" />No email service is configured.</li>}
          <li className="text-xs text-muted-foreground">Discount cap: no offer can exceed {s.discount.maxPercent}% in total. Current offer: {s.discount.percent}%.</li>
        </ul>
      )}

      {s && (
        <Section title="Today and next">
          <div className="grid sm:grid-cols-4 gap-4">
            <KV k="Today (UTC)">{s.today.date}</KV>
            <KV k="Type">{s.today.kind === "holiday" ? "Holiday offer" : "Regular"}</KV>
            <KV k="Email due today">{s.today.alreadySentToday ? "Already sent" : s.today.due ? "Yes" : "No"}</KV>
            <KV k="Next holiday">{s.nextHoliday ? `${s.nextHoliday.name}, ${s.nextHoliday.observed}` : "—"}</KV>
            <KV k="Active offer">{s.today.offer ? `${s.today.offer.code} (${s.today.offer.percent}%) through ${s.today.offer.validThrough}` : "None today"}</KV>
            <KV k="Confirmed subscribers receiving">{s.subscribers.active}</KV>
            <KV k="Awaiting confirmation (not emailed)">{s.subscribers.pending}</KV>
            <KV k="Unsubscribed">{s.subscribers.unsubscribed}</KV>
            <KV k="Last sent">{s.lastCampaign ? `${s.lastCampaign.key}: ${s.lastCampaign.counts.sent} sent, ${s.lastCampaign.counts.failed} failed` : "Never"}</KV>
          </div>
        </Section>
      )}

      <Section
        title="Preview"
        aside={
          <Button type="button" variant="outline" onClick={() => testSend.mutate()} disabled={testSend.isPending || !s?.ready.mail} className={btn}>
            {testSend.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-2" />Send test to me</>}
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Show the email for date (blank = today)</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-none h-9 w-48" />
          </label>
        </div>
        {preview.isLoading ? <Loader2 className="w-6 h-6 animate-spin text-accent" /> : preview.data && (
          <div className="space-y-3">
            <p className="text-sm"><span className="text-muted-foreground">Subject: </span>{preview.data.subject}</p>
            {/* Sandboxed with no permissions: the preview cannot run scripts or navigate. */}
            <iframe title="Email preview" sandbox="" srcDoc={preview.data.html} className="w-full h-[640px] border border-border bg-white" />
            <p className="text-xs text-muted-foreground">The preview uses a placeholder unsubscribe link. Real emails carry each subscriber's own link. A test send goes only to your own address and is not recorded as a campaign.</p>
          </div>
        )}
      </Section>

      <Section title="History">
        {history.data?.campaigns.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Subject</TableHead><TableHead>Type</TableHead><TableHead>Sent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {history.data.campaigns.map((c) => (
                <TableRow key={c.key}>
                  <TableCell className="tabular-nums text-xs">{c.key}</TableCell>
                  <TableCell className="text-sm">{c.subject}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.offerCode ?? "regular"}</TableCell>
                  <TableCell className="tabular-nums text-xs">{c.counts.sent}{c.counts.failed ? ` (${c.counts.failed} failed)` : ""}</TableCell>
                  <TableCell><StatusBadge status={c.status === "done" ? "completed" : "processing"} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No campaign email has been sent yet.</p>
        )}
      </Section>
    </main>
  );
}

export default function AdminCampaigns() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Campaigns | Apex Root Solutions";
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
                  <Link to="/admin/billing" className="text-muted-foreground hover:text-foreground transition-colors">Billing</Link>
                  <Link to="/admin/subscribers" className="text-muted-foreground hover:text-foreground transition-colors">Subscribers</Link>
                  <span className="text-foreground border-b border-accent pb-1">Campaigns</span>
                </nav>
              </div>
              <Button onClick={signOut} variant="outline" className="rounded-none h-10 px-4 text-xs tracking-wider uppercase gap-2"><LogOut className="w-3.5 h-3.5" /> Logout</Button>
            </div>
          </header>
          <Content />
        </div>
      )}
    </AdminGate>
  );
}
