import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Lock,
  Calendar,
  Users,
} from "lucide-react";

interface Subscriber {
  _id: string;
  email: string;
  createdAt: string;
}

interface SubscribersResponse {
  subscribers: Subscriber[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Subscribers() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Search & Pagination state
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Check login state on mount
  useEffect(() => {
    // The server validates the token; an expired or invalid one is dropped on
    // the first 401 (see the effect below the query).
    if (localStorage.getItem("apsoluts_admin_token")) {
      setIsLoggedIn(true);
    }
  }, []);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await api.post<{ success: boolean; token: string }>(
        "/api/auth/login",
        {
          email,
          password,
        },
      );

      if (response && response.token) {
        localStorage.setItem("apsoluts_admin_token", response.token);
        setIsLoggedIn(true);
        toast.success("Welcome back, Admin!");
      } else {
        toast.error("Invalid response from server.");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("apsoluts_admin_token");
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
    toast.success("Logged out successfully.");
  };

  // Query to fetch subscribers
  const { data, isLoading, isError, error, refetch } = useQuery<SubscribersResponse>({
    queryKey: ["subscribers", page, debouncedSearch],
    retry: (failureCount, err) => !(err instanceof ApiError && err.status === 401) && failureCount < 2,
    queryFn: async () => {
      const token = localStorage.getItem("apsoluts_admin_token");
      return api.get<SubscribersResponse>(
        `/api/newsletter?page=${page}&limit=10&search=${encodeURIComponent(debouncedSearch)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    },
    enabled: isLoggedIn, // Only run query when logged in
  });

  // A 401 means the session expired (tokens last 12 hours): sign out.
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      localStorage.removeItem("apsoluts_admin_token");
      setIsLoggedIn(false);
      toast.error("Your session expired. Please sign in again.");
    }
  }, [error]);

  // Render Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background z-0" />

        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

        <Card className="w-full max-w-md border-border bg-card/60 backdrop-blur-md relative z-10 rounded-none shadow-2xl">
          <CardHeader className="space-y-3 text-center pb-8 border-b border-border/60">
            <Link to="/">
              <img
                src="/apex-logo.png"
                alt="Apex Root Logo"
                className="h-12 w-12 object-contain mx-auto mb-2 cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
            <CardTitle className="text-3xl font-bold tracking-[0.1em] uppercase font-bebas text-foreground">
              Admin Portal
            </CardTitle>
            <CardDescription className="text-xs tracking-wider text-muted-foreground uppercase">
              Apex Root Solutions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="email"
                    placeholder="contact@apsoluts.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-background border-border text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:border-accent/60 rounded-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 bg-background border-border text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:border-accent/60 rounded-none transition-colors"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-11 text-[11px] tracking-[0.2em] uppercase font-medium transition-colors border border-accent/20"
              >
                {isLoggingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />{" "}
                    Authenticating...
                  </span>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
            <div className="text-center mt-6">
              <Link
                to="/"
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                ← Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Dashboard
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/80 bg-card/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <img
              src="/apex-logo.png"
              alt="Apex Root Logo"
              className="h-10 w-10 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold tracking-[0.05em] uppercase font-outfit text-foreground">
                APEX ROOT
              </h1>
            </div>
          </Link>
          <Link
            to="/admin/billing"
            className="ml-auto mr-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Billing
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-border hover:bg-accent/10 hover:text-accent hover:border-accent/30 text-xs tracking-wider uppercase rounded-none transition-all duration-300 gap-2 h-10 px-4"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card/20 p-5 border border-border/60">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
              <Input
                type="text"
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:border-accent/60 rounded-none transition-colors"
              />
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium bg-background px-4 py-2 border border-border/60">
              Total: {data?.totalCount ?? 0} subscribers
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-border bg-card/10 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Loading subscribers...
                </span>
              </div>
            ) : isError ? (
              <div className="text-center py-20 border border-dashed border-border m-6 space-y-3">
                <p className="text-sm text-destructive uppercase tracking-widest">
                  Failed to load subscriber list
                </p>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  className="text-xs rounded-none border-border"
                >
                  Try Again
                </Button>
              </div>
            ) : !data || data.subscribers.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground space-y-2">
                <Mail className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs uppercase tracking-widest">
                  No subscribers found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-card/45 border-b border-border">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-12 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold py-4">
                      #
                    </TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold py-4">
                      Email Address
                    </TableHead>
                    <TableHead className="w-48 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold py-4">
                      Date Joined
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.subscribers.map((sub, index) => (
                    <TableRow
                      key={sub._id}
                      className="border-border hover:bg-card/25 transition-colors"
                    >
                      <TableCell className="text-center text-xs text-muted-foreground py-4 font-mono">
                        {(page - 1) * 10 + index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground py-4">
                        {sub.email}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-4">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
                          {new Date(sub.createdAt).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination Controls */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border border-border/60 bg-card/20 p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="border-border hover:bg-card hover:text-foreground text-xs uppercase tracking-wider rounded-none transition-colors h-9 px-4 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(p)}
                      className={`h-9 w-9 rounded-none text-xs transition-colors font-medium border-border ${
                        p === page
                          ? "bg-accent hover:bg-accent text-accent-foreground border-accent"
                          : "hover:bg-card text-foreground"
                      }`}
                    >
                      {p}
                    </Button>
                  ),
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(data.totalPages, prev + 1))
                }
                disabled={page === data.totalPages}
                className="border-border hover:bg-card hover:text-foreground text-xs uppercase tracking-wider rounded-none transition-colors h-9 px-4 disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
