import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const Hero = () => {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background pt-16 lg:pt-20 pb-20 lg:pb-28"
    >
      {/* Cinematic background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.18,
        }}
      />

      {/* Bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 96%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 96%) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, letterSpacing: "0.35em" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-muted-foreground text-[10px] tracking-[0.35em] uppercase mb-8"
        >
          Mobile and Web App Development · Cedar Hill, TX
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-display leading-none tracking-wide text-foreground"
          style={{ fontSize: "clamp(2.5rem, 13vw, 11rem)" }}
        >
          BUILD SMARTER.
          <br />
          <span className="text-accent">LAUNCH FASTER.</span>
          <br />
          SCALE BIGGER.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-8 text-sm md:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed tracking-wide"
        >
          Apex Root Solutions LLC engineers mobile and web applications that transform businesses and connect brands to customers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <button
            onClick={() => scrollTo("#contact")}
            className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-3.5 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-foreground/85 transition-all duration-300"
          >
            Free Consultation
          </button>
          <button
            onClick={() => scrollTo("#services")}
            className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-3.5 border border-foreground/35 text-foreground text-[11px] tracking-[0.2em] uppercase font-medium hover:border-foreground/70 hover:bg-foreground/5 transition-all duration-300"
          >
            Our Services
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={() => scrollTo("#about")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Scroll down"
      >
        <span className="text-[9px] tracking-[0.3em] uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.button>
    </section>
  );
};

export default Hero;
