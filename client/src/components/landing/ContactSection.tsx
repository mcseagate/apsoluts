import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
} from "lucide-react";

const contactFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,20}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactFormSchema>;

const inputClass =
  "bg-background border-border text-foreground placeholder:text-muted-foreground/40 h-12 rounded-none focus-visible:ring-0 focus-visible:border-foreground/40 transition-colors text-sm";

const ContactSection = () => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({ resolver: zodResolver(contactFormSchema) });

  const mutation = useMutation({
    mutationFn: (data: ContactForm) => api.post<{ success: boolean; message: string }>("/api/contact", data),
    onSuccess: (data) => {
      toast({
        title: "Message sent!",
        description: data.message || "We will get back to you shortly.",
      });
      reset();
    },
    onError: (error) => {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again or contact us directly.",
        variant: "destructive",
      });
    },
  });

  return (
    <section id="contact" className="bg-secondary">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-background px-6 sm:px-8 md:px-12 lg:px-16 py-20 lg:py-28"
          >
            <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-6">
              Contact
            </p>
            <h2 className="font-display text-6xl lg:text-7xl leading-none tracking-wide text-foreground mb-14">
              LET'S BUILD
              <br />
              TOGETHER
            </h2>

            <div className="space-y-8">
              <a
                href="tel:3108496035"
                className="flex items-center gap-5 group"
              >
                <div className="w-10 h-10 border border-border flex items-center justify-center flex-shrink-0 group-hover:border-foreground/40 transition-colors">
                  <Phone className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-0.5">
                    Phone
                  </p>
                  <p className="text-foreground text-sm">(310) 849-6035</p>
                </div>
              </a>

              <a
                href="mailto:contact@apsoluts.com"
                className="flex items-center gap-5 group"
              >
                <div className="w-10 h-10 border border-border flex items-center justify-center flex-shrink-0 group-hover:border-foreground/40 transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-0.5">
                    Email
                  </p>
                  <p className="text-foreground text-sm">
                    contact@apsoluts.com
                  </p>
                </div>
              </a>

              <div className="flex items-center gap-5">
                <div className="w-10 h-10 border border-border flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-0.5">
                    Address
                  </p>
                  <p className="text-foreground text-sm">
                    1732 Orlando Dr, Cedar Hill, TX 75104
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-8 border-t border-border">
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-5">
                Follow Us
              </p>
              <div className="flex gap-3">
                <a
                  href="https://www.facebook.com/apexrootsolutions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 sm:w-10 sm:h-10 border border-border flex items-center justify-center hover:border-foreground/40 hover:text-foreground text-muted-foreground transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://www.instagram.com/apexrootsolutions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 sm:w-10 sm:h-10 border border-border flex items-center justify-center hover:border-foreground/40 hover:text-foreground text-muted-foreground transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
            className="px-6 sm:px-8 md:px-12 lg:px-16 py-20 lg:py-28"
          >
            <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-6">
              Send a Message
            </p>
            <form
              onSubmit={handleSubmit((data) => mutation.mutate(data))}
              className="space-y-6"
            >
              <div>
                <label className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground block mb-2">
                  Full Name *
                </label>
                <Input
                  {...register("fullName")}
                  placeholder="John Doe"
                  className={inputClass}
                />
                {errors.fullName ? (
                  <p className="text-destructive text-xs mt-1.5">
                    {errors.fullName.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground block mb-2">
                  Email Address *
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="john@example.com"
                  className={inputClass}
                />
                {errors.email ? (
                  <p className="text-destructive text-xs mt-1.5">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground block mb-2">
                  Phone Number
                </label>
                <Input
                  {...register("phone")}
                  type="tel"
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground block mb-2">
                  Message *
                </label>
                <Textarea
                  {...register("message")}
                  placeholder="Tell us about your project..."
                  rows={5}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/40 rounded-none focus-visible:ring-0 focus-visible:border-foreground/40 resize-none transition-colors text-sm"
                />
                {errors.message ? (
                  <p className="text-destructive text-xs mt-1.5">
                    {errors.message.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-foreground text-background text-[11px] tracking-[0.2em] uppercase font-medium py-4 hover:bg-foreground/85 disabled:opacity-40 transition-all duration-300"
              >
                {mutation.isPending ? "Sending..." : "Send Message"}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
