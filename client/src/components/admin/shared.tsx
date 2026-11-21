import type { ReactNode } from "react";
import type { HistoryEntry } from "@/types/billing";
import { fmtDate } from "./utils";

const TONES: Record<string, string> = {
  new: "border-accent/60 text-accent",
  reviewing: "border-amber-500/50 text-amber-400",
  converted: "border-emerald-500/50 text-emerald-400",
  declined: "border-border text-muted-foreground",
  draft: "border-border text-muted-foreground",
  active: "border-emerald-500/50 text-emerald-400",
  completed: "border-emerald-500/50 text-emerald-400",
  cancelled: "border-border text-muted-foreground",
  unpaid: "border-amber-500/50 text-amber-400",
  overdue: "border-accent text-accent",
  paid: "border-emerald-500/50 text-emerald-400",
  void: "border-border text-muted-foreground line-through",
  processing: "border-amber-500/50 text-amber-400",
  open: "border-amber-500/50 text-amber-400",
  failed: "border-accent/60 text-accent",
  rejected: "border-accent text-accent",
  needs_attention: "border-accent text-accent",
  refunded: "border-sky-500/50 text-sky-400",
  partially_refunded: "border-sky-500/50 text-sky-400",
  expired: "border-border text-muted-foreground",
  superseded: "border-border text-muted-foreground",
};

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${TONES[status] ?? "border-border text-muted-foreground"}`}>
    {status.replace(/_/g, " ")}
  </span>
);

export const Label = ({ children }: { children: ReactNode }) => (
  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{children}</span>
);

export const Section = ({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) => (
  <section className="border border-border bg-card/20 p-5 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[11px] uppercase tracking-[0.25em] text-foreground font-medium">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

export const KV = ({ k, children }: { k: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <Label>{k}</Label>
    <div className="text-sm text-foreground break-words">{children}</div>
  </div>
);

export const History = ({ entries }: { entries: HistoryEntry[] }) => (
  <ol className="space-y-2 text-xs">
    {entries.map((h, i) => (
      <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 border-l border-border pl-3">
        <span className="text-muted-foreground tabular-nums">{fmtDate(h.at)}</span>
        <span className="text-foreground">
          {h.scope ? `${h.scope} · ` : ""}
          {h.action.replace(/_/g, " ")}
        </span>
        {(h.from || h.to) && (
          <span className="text-muted-foreground">
            {h.from ?? "—"} → {h.to ?? "—"}
          </span>
        )}
        <span className="text-muted-foreground">by {h.actor}</span>
        {h.detail && <span className="text-muted-foreground">{h.detail}</span>}
      </li>
    ))}
    {!entries.length && <li className="text-muted-foreground">Nothing yet.</li>}
  </ol>
);
