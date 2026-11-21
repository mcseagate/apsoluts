import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { Invoice, PagedList, Project, Quote } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KV, Section, StatusBadge } from "./shared";
import { fmtDate, toastError } from "./utils";

const btn = "rounded-none h-9 px-3 text-[11px] uppercase tracking-[0.15em]";

function Pager({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (n: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-3 p-3 text-xs text-muted-foreground">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-none"><ChevronLeft className="w-4 h-4" /></Button>
      Page {page} of {totalPages}
      <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-none"><ChevronRight className="w-4 h-4" /></Button>
    </div>
  );
}

const Empty = ({ children }: { children: string }) => <p className="py-16 text-center text-sm text-muted-foreground">{children}</p>;
const Loading = () => <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto my-16" />;

// ---------------------------------------------------------------------------

export function QuotesList({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-quotes", page, status],
    queryFn: () => adminApi.get<PagedList<"quotes", Quote>>(`/api/admin/quotes?page=${page}&limit=15${status ? `&status=${status}` : ""}`),
  });
  const open = data?.quotes.find((q) => q.id === openId) ?? null;

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-quotes"] });
  const update = useMutation({
    mutationFn: (body: object) => adminApi.patch(`/api/admin/quotes/${openId}`, body),
    onSuccess: () => { toast.success("Request updated"); refresh(); },
    onError: toastError,
  });
  const convert = useMutation({
    mutationFn: () => adminApi.post<Project>(`/api/admin/quotes/${openId}/convert`),
    onSuccess: (p) => { toast.success("Project created"); refresh(); qc.invalidateQueries({ queryKey: ["admin-projects"] }); onOpenProject(p.id); },
    onError: toastError,
  });

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_26rem] gap-6">
      <div className="border border-border bg-card/10">
        <div className="flex items-center gap-3 p-3 border-b border-border">
          <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 border border-input bg-background px-2 text-sm rounded-none">
            <option value="">All requests</option><option value="new">New</option><option value="reviewing">Reviewing</option><option value="converted">Converted</option><option value="declined">Declined</option>
          </select>
          <span className="text-xs text-muted-foreground">{data?.total ?? 0} total</span>
        </div>
        {isLoading ? <Loading /> : !data?.quotes.length ? <Empty>No quote requests yet. They arrive from the form at /quote.</Empty> : (
          <Table>
            <TableHeader><TableRow><TableHead>From</TableHead><TableHead>Budget</TableHead><TableHead>Received</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.quotes.map((q) => (
                <TableRow key={q.id} onClick={() => { setOpenId(q.id); setNote(q.adminNote); }} className={`cursor-pointer ${q.id === openId ? "bg-accent/10" : ""}`}>
                  <TableCell><button type="button" className="text-left" aria-label={`Open request from ${q.name}`}>{q.name}<br /><span className="text-xs text-muted-foreground">{q.email}</span></button></TableCell>
                  <TableCell className="text-sm">{q.budget || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(q.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager page={page} totalPages={data?.totalPages ?? 1} setPage={setPage} />
      </div>

      {open && (
        <Section title="Request" aside={<StatusBadge status={open.status} />}>
          <div className="grid grid-cols-2 gap-4"><KV k="Name">{open.name}</KV><KV k="Budget">{open.budget || "—"}</KV></div>
          <KV k="Email"><a href={`mailto:${open.email}`} className="text-accent underline-offset-4 hover:underline">{open.email}</a></KV>
          <KV k="Requirements"><span className="whitespace-pre-wrap">{open.requirements}</span></KV>
          {open.status !== "converted" ? (
            <>
              <label className="space-y-1 block"><span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Private note</span><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} className="rounded-none" /></label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => convert.mutate()} disabled={convert.isPending} className={`${btn} bg-accent text-accent-foreground hover:bg-accent/90`}>Create project</Button>
                <Button type="button" variant="outline" className={btn} onClick={() => update.mutate({ status: "reviewing", adminNote: note })}>Mark reviewing</Button>
                <Button type="button" variant="outline" className={btn} onClick={() => update.mutate({ status: "declined", adminNote: note })}>Decline</Button>
                <Button type="button" variant="outline" className={btn} onClick={() => update.mutate({ adminNote: note })}>Save note</Button>
              </div>
            </>
          ) : open.projectId && <Button type="button" variant="outline" className={btn} onClick={() => onOpenProject(open.projectId!)}>Open project</Button>}
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ProjectsList({ onOpen }: { onOpen: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-projects", page],
    queryFn: () => adminApi.get<PagedList<"projects", Project>>(`/api/admin/projects?page=${page}&limit=15`),
  });
  return (
    <div className="border border-border bg-card/10">
      {isLoading ? <Loading /> : !data?.projects.length ? <Empty>No projects yet. Open a quote request and choose “Create project”.</Empty> : (
        <Table>
          <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Price</TableHead><TableHead>Accepted</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.projects.map((p) => (
              <TableRow key={p.id} onClick={() => onOpen(p.id)} className="cursor-pointer">
                <TableCell><button type="button" className="text-left" aria-label={`Open project ${p.title}`}>{p.title}<br /><span className="text-xs text-muted-foreground">{p.clientName}</span></button></TableCell>
                <TableCell className="tabular-nums">{p.priceMinor ? p.priceDisplay : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.acceptance ? fmtDate(p.acceptance.acceptedAt) : "Not yet"}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pager page={page} totalPages={data?.totalPages ?? 1} setPage={setPage} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function InvoicesList({ onOpen }: { onOpen: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-invoices", page, status, q],
    queryFn: () => adminApi.get<PagedList<"invoices", Invoice>>(`/api/admin/invoices?page=${page}&limit=15${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  });
  return (
    <div className="border border-border bg-card/10">
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 border border-input bg-background px-2 text-sm rounded-none">
          <option value="">All invoices</option><option value="draft">Draft</option><option value="unpaid">Unpaid</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="void">Void</option>
        </select>
        <Input placeholder="Search number, client or project" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="rounded-none h-9 max-w-xs" />
        <span className="text-xs text-muted-foreground">{data?.total ?? 0} total</span>
      </div>
      {isLoading ? <Loading /> : !data?.invoices.length ? <Empty>No invoices match. Create one from an accepted project.</Empty> : (
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.invoices.map((i) => (
              <TableRow key={i.id} onClick={() => onOpen(i.id)} className="cursor-pointer">
                <TableCell><button type="button" className="text-left" aria-label={`Open invoice ${i.number ?? "draft"}`}>{i.number ?? "Draft"}<br /><span className="text-xs text-muted-foreground">{i.milestoneLabel}</span></button></TableCell>
                <TableCell className="text-sm">{i.clientName}<br /><span className="text-xs text-muted-foreground">{i.projectTitle}</span></TableCell>
                <TableCell className="tabular-nums">{i.amountDisplay}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{i.dueDate}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1"><StatusBadge status={i.status} />{i.flags.some((f) => f.code !== "refunded") && <StatusBadge status="needs_attention" />}</div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pager page={page} totalPages={data?.totalPages ?? 1} setPage={setPage} />
    </div>
  );
}
