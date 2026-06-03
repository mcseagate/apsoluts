import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (email: string) =>
      api.post<{ success: boolean; message: string }>("/api/newsletter", { email }),
    onSuccess: (data) => {
      toast({ title: "Subscribed!", description: data.message });
      setEmail("");
    },
    onError: (error) => {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again or email us at contact@apsoluts.com.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) mutation.mutate(email);
  };

  return (
    <section className="bg-accent py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8"
        >
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-wide text-accent-foreground leading-none">
              STAY IN THE LOOP
            </h2>
            <p className="mt-2 text-accent-foreground/70 text-sm tracking-wide">
              Industry insights and company updates, delivered to your inbox.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row w-full lg:max-w-md">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={mutation.isPending}
              className="flex-1 bg-accent-foreground/10 border border-accent-foreground/20 text-accent-foreground placeholder:text-accent-foreground/40 px-4 py-3 text-sm outline-none focus:border-accent-foreground/50 transition-colors disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-accent-foreground text-accent px-6 py-3 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-accent-foreground/90 transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-60"
            >
              {mutation.isPending ? "..." : "Subscribe"}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default Newsletter;
