import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// A small live readout: the browser pings the studio's own API and reports the
// real round-trip time. It hides itself if the API cannot be reached.

type State = { kind: "checking" } | { kind: "up"; ms: number } | { kind: "down" };

const LiveStatus = ({ className = "" }: { className?: string }) => {
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    let alive = true;
    let timer = 0;

    const ping = async () => {
      const started = performance.now();
      try {
        await api.get("/api/health");
        if (alive) setState({ kind: "up", ms: Math.round(performance.now() - started) });
      } catch {
        if (alive) setState({ kind: "down" });
      }
      if (alive && !document.hidden) timer = window.setTimeout(ping, 30000);
    };
    const onVisible = () => {
      if (!document.hidden) {
        window.clearTimeout(timer);
        ping();
      }
    };

    ping();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (state.kind !== "up") return null;
  return (
    <p
      className={`inline-flex items-center gap-2.5 border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground ${className}`}
      role="status"
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      Live · API {state.ms} ms
    </p>
  );
};

export default LiveStatus;
