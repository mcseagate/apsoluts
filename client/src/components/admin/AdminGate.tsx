import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Lock, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { ADMIN_TOKEN_KEY, ADMIN_UNAUTHORIZED } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Shows the sign-in form until there is an admin token, then renders the page.
// This only decides what to display: every /api/admin call is checked again on
// the server.
export default function AdminGate({ children }: { children: (signOut: () => void) => ReactNode }) {
  const [signedIn, setSignedIn] = useState(() => Boolean(localStorage.getItem(ADMIN_TOKEN_KEY)));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      setSignedIn(false);
      toast.error("Your session expired. Please sign in again.", { id: "admin-session-expired" }); // one toast, however many requests failed
    };
    window.addEventListener(ADMIN_UNAUTHORIZED, onExpired);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED, onExpired);
  }, []);

  const signOut = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setSignedIn(false);
    setPassword("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ token: string }>("/api/auth/login", { email, password });
      if (!res?.token) throw new Error("Invalid response from server.");
      localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
      setSignedIn(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setBusy(false);
    }
  };

  if (signedIn) return <>{children(signOut)}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card/60 backdrop-blur-md rounded-none shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-8 border-b border-border/60">
          <CardTitle className="text-3xl font-bold tracking-[0.1em] uppercase font-bebas text-foreground">Admin Portal</CardTitle>
          <CardDescription className="text-xs tracking-wider text-muted-foreground uppercase">Billing · Apex Root Solutions</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={submit} className="space-y-6">
            <label className="block space-y-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Email Address</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" className="pl-10 h-11 rounded-none bg-background" />
              </div>
            </label>
            <label className="block space-y-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Password</span>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="pl-10 h-11 rounded-none bg-background" />
              </div>
            </label>
            <Button type="submit" disabled={busy} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-11 text-[11px] tracking-[0.2em] uppercase font-medium">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log In"}
            </Button>
          </form>
          <div className="text-center mt-6">
            <Link to="/" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors font-medium">
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
