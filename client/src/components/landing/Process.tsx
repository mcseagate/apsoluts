import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll } from "framer-motion";

// "How we work": as the visitor scrolls the steps, a terminal on the left
// runs the matching log, and a red line along the steps fills in.

interface Step {
  number: string;
  title: string;
  body: string;
  log: { text: string; ok?: boolean }[];
}

const steps: Step[] = [
  {
    number: "01",
    title: "Discover",
    body: "We start with your goals, your users and your limits, then agree the scope and a price range before any code exists.",
    log: [
      { text: "$ apex discover --goals --users --budget" },
      { text: "mapping goals and constraints" },
      { text: "scope agreed, estimate sent", ok: true },
    ],
  },
  {
    number: "02",
    title: "Design",
    body: "Screens, flows and a visual system you can click through on your own phone or PC before we commit to building them.",
    log: [
      { text: "$ apex design --prototype" },
      { text: "flows drawn, screens composed" },
      { text: "clickable prototype shared", ok: true },
    ],
  },
  {
    number: "03",
    title: "Build",
    body: "Native, Flutter or Expo for phones, a native Windows application for the desktop, and one clean API and database behind them all. You see a working build every week.",
    log: [
      { text: "$ apex build --ios --android --web --windows" },
      { text: "api, database and auth online" },
      { text: "weekly builds delivered", ok: true },
    ],
  },
  {
    number: "04",
    title: "Test",
    body: "Real devices, real networks and the awkward cases: rotation, slow connections, a phone that is almost out of battery, a Windows PC that is a few years old.",
    log: [
      { text: "$ apex test --devices --windows --offline" },
      { text: "devices, networks and edge cases run" },
      { text: "release candidate signed off", ok: true },
    ],
  },
  {
    number: "05",
    title: "Ship",
    body: "We prepare the store listings or a signed Windows installer, handle review and push the release live, then stay on to keep it fast and current.",
    log: [
      { text: "$ apex ship --app-store --google-play --windows" },
      { text: "listings and installer prepared" },
      { text: "live. monitoring on", ok: true },
    ],
  },
];

const StepItem = ({ step, index, onActive }: { step: Step; index: number; onActive: (i: number) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <div ref={ref} className="relative pl-10 lg:pl-14 py-10 lg:min-h-[44vh] lg:flex lg:items-center">
      <div className="max-w-md">
        <p className="font-display text-sm tracking-[0.3em] text-accent">STEP {step.number}</p>
        <h3 className="mt-2 font-display text-5xl tracking-wide text-foreground md:text-6xl">{step.title.toUpperCase()}</h3>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        {/* phones and tablets have no sticky terminal, so each step carries its own log */}
        <pre className="mt-6 overflow-x-auto border border-border bg-card p-4 font-mono text-[11px] leading-relaxed text-muted-foreground lg:hidden">
          {step.log.map((l) => (
            <span key={l.text} className="block">
              {l.ok ? <span className="text-accent">✔ </span> : null}
              {l.text}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
};

const Process = () => {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 60%", "end 60%"] });

  return (
    <section id="process" className="relative bg-background py-28 lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 lg:mb-24"
        >
          <p className="mb-4 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">How We Work</p>
          <h2 className="font-display text-5xl leading-none tracking-wide text-foreground md:text-7xl lg:text-9xl">
            IDEA TO
            <br />
            <span className="text-outline">APP STORE</span>
          </h2>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          {/* steps with a progress rail */}
          <div ref={listRef} className="relative">
            <div aria-hidden className="absolute bottom-0 left-[7px] top-0 w-px bg-border" />
            <motion.div
              aria-hidden
              className="absolute left-[6px] top-0 w-[3px] origin-top bg-accent shadow-[0_0_14px_2px_hsl(var(--accent)/0.6)]"
              style={{ scaleY: scrollYProgress, height: "100%" }}
            />
            {steps.map((s, i) => (
              <div key={s.number} className="relative">
                <span
                  aria-hidden
                  className={`absolute left-0 top-1/2 h-[15px] w-[15px] -translate-y-1/2 rotate-45 border transition-colors duration-300 lg:top-1/2 ${
                    i <= active ? "border-accent bg-accent" : "border-foreground/30 bg-background"
                  }`}
                />
                <StepItem step={s} index={i} onActive={setActive} />
              </div>
            ))}
          </div>

          {/* sticky terminal, large screens only */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="overflow-hidden border border-border bg-card shadow-[0_0_80px_-20px_hsl(var(--accent)/0.45)]">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
                  <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    apex — build log
                  </span>
                </div>

                <div className="min-h-[360px] p-6 font-mono text-[13px] leading-7" aria-live="off">
                  {steps.map((s, si) =>
                    si <= active ? (
                      <div key={s.number} className={si === active ? "" : "opacity-40"}>
                        {s.log.map((l, li) => (
                          <motion.p
                            key={`${active}-${l.text}`}
                            initial={si === active ? { opacity: 0, x: -8 } : false}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: si === active ? li * 0.35 : 0 }}
                            className={l.text.startsWith("$") ? "text-foreground" : "text-muted-foreground"}
                          >
                            {l.ok && <span className="text-accent">✔ </span>}
                            {l.text}
                          </motion.p>
                        ))}
                      </div>
                    ) : null,
                  )}
                  <p className="mt-2 text-foreground">
                    $ <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-accent" />
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border px-6 py-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  <span>
                    Step {steps[active].number} / {String(steps.length).padStart(2, "0")}
                  </span>
                  <span className="text-accent">{steps[active].title}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
