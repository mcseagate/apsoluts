import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ShaderField from "@/components/fx/ShaderField";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email address").max(254),
  requirements: z.string().trim().min(20, "Tell us a little more (at least 20 characters)").max(5000, "Please keep it under 5,000 characters"),
  budget: z.string().trim().max(100, "Keep this short, for example \"$5k to $10k\"").optional().or(z.literal("")),
  offerCode: z.string().trim().max(40, "That code is too long").optional().or(z.literal("")),
});
type QuoteForm = z.infer<typeof schema>;

const inputClass = "bg-background border-border text-foreground placeholder:text-muted-foreground/40 h-12 rounded-none focus-visible:ring-0 focus-visible:border-foreground/40 transition-colors text-sm";

const Quote = () => {
  const { toast } = useToast();
  const [sent, setSent] = useState<string | null>(null);
  // A link from a holiday email arrives as /quote?offer=CODE and fills the field in.
  const [params] = useSearchParams();
  // When the form appeared: a person takes longer to fill it in than a script.
  const shownAt = useRef(Date.now());
  const { register, handleSubmit, formState: { errors } } = useForm<QuoteForm>({ resolver: zodResolver(schema), defaultValues: { offerCode: (params.get("offer") ?? "").slice(0, 40) } });

  useEffect(() => {
    const previous = document.title;
    document.title = "Request a Quote | Apex Root Solutions";
    return () => { document.title = previous; };
  }, []);

  const mutation = useMutation({
    mutationFn: (data: QuoteForm & { website: string }) =>
      api.post<{ success: boolean; message: string }>("/api/quotes", { ...data, elapsedMs: Date.now() - shownAt.current }),
    onSuccess: (res) => setSent(res.message),
    onError: (error) =>
      toast({ title: "We could not send that", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }),
  });

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px]">
        <ShaderField intensity={0.7} className="h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>

      <div className="relative z-10 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 flex items-center justify-between">
          <Link to="/" className="font-display text-xl tracking-[0.2em] text-foreground hover:text-muted-foreground transition-colors">APEX ROOT</Link>
          <Link to="/pricing" className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors">← Pricing</Link>
        </div>
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-4">Custom projects</p>
        <h1 className="font-display text-6xl md:text-8xl leading-none tracking-wide mb-6">
          REQUEST
          <br />
          <span className="text-outline">A QUOTE</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mb-12">
          Tell us what you want built. We will reply by email with questions or a proposal. Nothing is charged and nothing is agreed until you accept a written scope and price.
        </p>

        {sent ? (
          <div role="status" className="border border-border bg-card/30 p-8 flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-accent shrink-0" aria-hidden />
            <div>
              <h2 className="font-display text-3xl tracking-wide mb-2">REQUEST RECEIVED</h2>
              <p className="text-sm text-muted-foreground">{sent}</p>
              <Link to="/" className="inline-block mt-6 text-[11px] uppercase tracking-[0.2em] text-accent hover:text-foreground transition-colors">Back to home →</Link>
            </div>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={handleSubmit((data) => mutation.mutate({ ...data, website: (document.getElementById("quote-website") as HTMLInputElement | null)?.value ?? "" }))}
            className="space-y-6"
          >
            {/* A trap for scripts: people never see or fill this in. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="quote-website">Website</label>
              <input id="quote-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <label className="block space-y-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your name</span>
                <Input {...register("name")} autoComplete="name" aria-invalid={Boolean(errors.name)} className={inputClass} />
                {errors.name && <span role="alert" className="text-xs text-accent">{errors.name.message}</span>}
              </label>
              <label className="block space-y-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Email</span>
                <Input {...register("email")} type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} className={inputClass} />
                {errors.email && <span role="alert" className="text-xs text-accent">{errors.email.message}</span>}
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Project requirements</span>
              <Textarea {...register("requirements")} rows={8} aria-invalid={Boolean(errors.requirements)} placeholder="What should it do? Who is it for? Platforms (iOS, Android, web, Windows), deadlines, anything we should know." className="bg-background border-border rounded-none focus-visible:ring-0 focus-visible:border-foreground/40 text-sm" />
              {errors.requirements && <span role="alert" className="text-xs text-accent">{errors.requirements.message}</span>}
            </label>
            <label className="block space-y-2 sm:max-w-xs">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Budget (optional)</span>
              <Input {...register("budget")} placeholder="For example $5k to $10k" aria-invalid={Boolean(errors.budget)} className={inputClass} />
              {errors.budget && <span role="alert" className="text-xs text-accent">{errors.budget.message}</span>}
            </label>
            <label className="block space-y-2 sm:max-w-xs">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Offer code (optional)</span>
              <Input {...register("offerCode")} placeholder="From one of our emails" autoCapitalize="characters" aria-invalid={Boolean(errors.offerCode)} className={inputClass} />
              {errors.offerCode && <span role="alert" className="text-xs text-accent">{errors.offerCode.message}</span>}
            </label>
            <button type="submit" disabled={mutation.isPending} className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-accent/90 transition-colors disabled:opacity-60">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
              Send request
            </button>
            <p className="text-xs text-muted-foreground">We use your details only to reply to this request.</p>
          </form>
        )}
      </main>
    </div>
  );
};

export default Quote;
