import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";

// Opened from the "Confirm subscription" link in the confirmation email:
// /confirm#<token>. Same design as /unsubscribe: the token stays in the URL
// fragment and goes to the API in a header, and nothing happens until the visitor
// presses the button, so a mail scanner that merely opens the link cannot confirm
// a subscription on someone's behalf.

type State = "idle" | "working" | "done" | "invalid" | "error";

export default function Confirm() {
  const [token] = useState(() => window.location.hash.replace(/^#/, ""));
  const [state, setState] = useState<State>(token ? "idle" : "invalid");

  useEffect(() => {
    const previous = document.title;
    document.title = "Confirm subscription | Apex Root Solutions";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = previous;
      meta.remove();
    };
  }, []);

  const confirm = async () => {
    setState("working");
    try {
      await api.post("/api/newsletter/confirm", undefined, { headers: { "X-Confirm-Token": token } });
      setState("done");
    } catch (err) {
      setState(err instanceof ApiError && err.status === 404 ? "invalid" : "error");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <Link to="/" className="font-display text-xl tracking-[0.2em] transition-colors hover:text-muted-foreground">APEX ROOT</Link>
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-6 py-16">
        {state === "done" ? (
          <div role="status" className="flex gap-4 border border-border bg-card/30 p-8">
            <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-accent" aria-hidden />
            <div>
              <h1 className="mb-3 font-display text-4xl tracking-wide">YOU ARE SUBSCRIBED</h1>
              <p className="text-sm leading-relaxed text-foreground/80">
                Thank you. A welcome email is on its way. You can unsubscribe at any time using the link at the bottom of every email.
              </p>
              <Link to="/" className="mt-6 inline-block text-[11px] uppercase tracking-[0.2em] text-accent hover:text-foreground">Back to home →</Link>
            </div>
          </div>
        ) : state === "invalid" ? (
          <div role="alert" className="border border-border bg-card/30 p-8">
            <h1 className="mb-3 font-display text-4xl tracking-wide">LINK NOT VALID</h1>
            <p className="text-sm leading-relaxed text-foreground/80">
              This confirmation link is not valid. You can subscribe again from the form on our website, or write to{" "}
              <a href="mailto:contact@apsoluts.com" className="underline underline-offset-4">contact@apsoluts.com</a>.
            </p>
          </div>
        ) : (
          <div className="border border-border bg-card/30 p-8">
            <h1 className="mb-3 font-display text-4xl tracking-wide">CONFIRM YOUR SUBSCRIPTION</h1>
            <p className="mb-6 text-sm leading-relaxed text-foreground/80">
              Press the button to receive updates from Apex Root Solutions about every three days, plus holiday offers. You can unsubscribe at any time.
            </p>
            <button
              type="button"
              onClick={confirm}
              disabled={state === "working"}
              className="inline-flex min-h-12 items-center gap-2 bg-accent px-8 py-3 text-xs font-medium uppercase tracking-[0.18em] text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60"
            >
              {state === "working" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Confirm subscription
            </button>
            {state === "error" && (
              <p role="alert" className="mt-4 text-sm text-accent">
                We could not complete that. Please try again, or write to contact@apsoluts.com.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
