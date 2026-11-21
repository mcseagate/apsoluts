import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import ShaderField from "@/components/fx/ShaderField";
import { openPalette } from "@/components/fx/CommandPalette";

const lines = [
  { text: "BUILD SMARTER.", className: "text-foreground" },
  { text: "LAUNCH FASTER.", className: "text-ember" },
  { text: "SCALE BIGGER.", className: "text-outline" },
];

const Hero = () => {
  const { scrollY } = useScroll();
  // the field drifts and dims as the page moves, so it hands over to the next section
  const fieldY = useTransform(scrollY, [0, 800], [0, 160]);
  const fieldOpacity = useTransform(scrollY, [0, 700], [1, 0.25]);

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background pt-16 lg:pt-20 pb-24 lg:pb-32"
    >
      {/* live red field */}
      <motion.div className="absolute inset-0" style={{ y: fieldY, opacity: fieldOpacity }}>
        <ShaderField className="h-[115%]" />
      </motion.div>

      {/* grid, fades toward the edges */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 96%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 96%) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent 75%)",
        }}
      />

      {/* settle into the page below */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />

      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, letterSpacing: "0.35em" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mb-8 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-foreground/70"
        >
          <span aria-hidden className="h-px w-8 bg-accent" />
          Mobile and Web App Development · Cedar Hill, TX
          <span aria-hidden className="h-px w-8 bg-accent" />
        </motion.p>

        <h1
          className="font-display leading-[0.95] tracking-wide"
          style={{ fontSize: "clamp(2.5rem, 13vw, 11rem)" }}
        >
          {lines.map((l, i) => (
            <span key={l.text} className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className={`block ${l.className}`}
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.95, delay: 0.2 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
              >
                {l.text}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mx-auto mt-8 max-w-lg text-sm leading-relaxed tracking-wide text-foreground/70 md:text-base"
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
            className="group relative w-full overflow-hidden bg-accent px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-accent-foreground shadow-[0_0_40px_-8px_hsl(var(--accent))] transition-all duration-300 hover:shadow-[0_0_60px_-4px_hsl(var(--accent))] sm:w-auto sm:px-10 sm:py-3.5"
          >
            <span className="relative z-10">Free Consultation</span>
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-foreground/15 transition-transform duration-500 group-hover:translate-x-0"
            />
          </button>
          <button
            onClick={() => scrollTo("#services")}
            className="w-full border border-foreground/35 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-foreground transition-all duration-300 hover:border-accent hover:bg-accent/10 sm:w-auto sm:px-10 sm:py-3.5"
          >
            Our Services
          </button>
        </motion.div>

        <motion.button
          type="button"
          onClick={openPalette}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-8 hidden items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
        >
          Jump anywhere
          <kbd className="border border-foreground/25 px-2 py-1 font-sans text-[10px] tracking-normal text-foreground/80">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </motion.button>
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
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
          <ChevronDown className="h-4 w-4 text-accent" />
        </motion.div>
      </motion.button>
    </section>
  );
};

export default Hero;
