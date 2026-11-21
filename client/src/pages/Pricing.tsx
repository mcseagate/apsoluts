import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowRight, Check, Minus, Phone, Plus, RotateCcw } from "lucide-react";
import {
  allTech,
  groups,
  lowerEnd,
  money,
  services,
  techGroups,
  upperEnd,
  type Service,
} from "@/data/pricing";

/* ---------- price ladder maths ---------- */

// The ladder is logarithmic: every gridline is ten times the one before, so a
// $150 site and a $35,000 platform can share one scale and both stay readable.
const AXIS_MIN = 100;
const AXIS_MAX = 40000;
const ticks = [
  { value: 100, label: "$100" },
  { value: 1000, label: "$1K" },
  { value: 10000, label: "$10K" },
  { value: 40000, label: "$40K" },
];
const pos = (v: number) =>
  ((Math.log(v) - Math.log(AXIS_MIN)) / (Math.log(AXIS_MAX) - Math.log(AXIS_MIN))) * 100;

const projectServices = services.filter((s) => s.unit === "project");
const cheapest = Math.min(...projectServices.map((s) => s.min));
const biggest = Math.max(...projectServices.map((s) => s.max));
const hourly = services.find((s) => s.unit === "hour");

const DEFAULT_HOURS = 10;

/* ---------- small helpers ---------- */

// Eases a number toward its target so the total glides instead of jumping.
function useTween(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 450);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = origin + (target - origin) * eased;
      from.current = current;
      setValue(current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return value;
}

const priceText = (s: Service) =>
  s.unit === "hour" ? `${money(s.min)}–${money(s.max)}/hour` : `${money(s.min)}–${money(s.max)}`;

const eyebrow = "text-[10px] tracking-[0.35em] uppercase text-muted-foreground";

/* ---------- ladder row ---------- */

interface RowProps {
  service: Service;
  index: number;
  selected: boolean;
  onToggle: () => void;
  hours: number;
  onHours: (n: number) => void;
}

const LadderRow = ({ service, index, selected, onToggle, hours, onHours }: RowProps) => {
  const isHourly = service.unit === "hour";
  const left = pos(service.min);
  const width = pos(service.max) - left;

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={`group relative z-10 block w-full px-5 py-6 text-left transition-colors hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
          selected ? "bg-card shadow-[inset_2px_0_0_0_hsl(var(--accent))]" : ""
        }`}
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
              selected
                ? "border-accent bg-accent text-accent-foreground"
                : "border-foreground/30 text-transparent group-hover:border-foreground/60"
            }`}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <h4 className="font-display text-2xl leading-tight tracking-wide text-foreground md:text-3xl">
                <span className="mr-3 text-base text-muted-foreground/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {service.name}
              </h4>
              <p
                className={`shrink-0 font-display text-2xl tracking-wide md:text-3xl ${
                  selected ? "text-accent" : "text-foreground"
                }`}
              >
                {priceText(service)}
              </p>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{service.blurb}</p>
          </div>
        </div>

        {/* the bar sits on the same axis as the gridlines behind the list */}
        {isHourly ? (
          <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Billed by the hour, so it sits off the ladder
          </p>
        ) : (
          <div className="mt-5 h-3 w-full bg-muted/70" aria-hidden>
            <div className="relative h-full">
              <motion.div
                className={`absolute inset-y-0 transition-colors ${
                  selected ? "bg-accent" : "bg-foreground/35 group-hover:bg-foreground/65"
                }`}
                style={{ left: `${left}%`, width: `${width}%`, originX: 0 }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: (index % 4) * 0.06 }}
              />
            </div>
          </div>
        )}

        <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Built with`}>
          {service.tech.map((t) => (
            <li
              key={t}
              className="border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:border-foreground/30"
            >
              {t}
            </li>
          ))}
        </ul>
      </button>

      {/* kept outside the toggle button: buttons cannot nest */}
      <AnimatePresence initial={false}>
        {isHourly && selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 overflow-hidden bg-card shadow-[inset_2px_0_0_0_hsl(var(--accent))]"
          >
            <div className="flex flex-wrap items-center gap-4 px-5 pb-6 pl-14">
              <label htmlFor="dba-hours" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Hours you expect
              </label>
              <div className="flex items-center border border-border">
                <button
                  type="button"
                  aria-label="Fewer hours"
                  onClick={() => onHours(Math.max(1, hours - 1))}
                  className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="dba-hours"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  value={hours}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    onHours(Number.isFinite(n) ? Math.min(500, Math.max(1, n)) : 1);
                  }}
                  className="h-10 w-16 border-x border-border bg-transparent text-center font-display text-xl text-foreground [appearance:textfield] focus:outline-none focus-visible:bg-muted [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label="More hours"
                  onClick={() => onHours(Math.min(500, hours + 1))}
                  className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {money(service.min * hours)}–{money(service.max * hours)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
};

/* ---------- page ---------- */

const Pricing = () => {
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [hours, setHours] = useState(DEFAULT_HOURS);

  useEffect(() => {
    const previous = document.title;
    document.title = "Pricing | Apex Root Solutions";
    return () => {
      document.title = previous;
    };
  }, []);

  const chosen = useMemo(() => services.filter((s) => picked[s.id]), [picked]);

  const { low, high } = useMemo(() => {
    let lo = 0;
    let hi = 0;
    for (const s of chosen) {
      const qty = s.unit === "hour" ? hours : 1;
      lo += s.min * qty;
      hi += s.max * qty;
    }
    return { low: lo, high: hi };
  }, [chosen, hours]);

  const shownLow = useTween(low);
  const shownHigh = useTween(high);

  const toggle = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  const mailto = useMemo(() => {
    const lines = chosen.map((s) => {
      if (s.unit === "hour") return `- ${s.name}: ${hours} hours (${money(s.min * hours)}-${money(s.max * hours)})`;
      return `- ${s.name}: ${money(s.min)}-${money(s.max)}`;
    });
    const body = [
      "Hello Apex Root,",
      "",
      "I built this estimate on your pricing page:",
      ...lines,
      `Total range: ${money(low)}-${money(high)}`,
      "",
      "A little about my project:",
      "",
    ].join("\n");
    return `mailto:contact@apsoluts.com?subject=${encodeURIComponent("Project estimate")}&body=${encodeURIComponent(body)}`;
  }, [chosen, hours, low, high]);

  // Continues the running index across groups so rows read 01 to 10.
  let counter = -1;

  const half = Math.ceil(allTech.length / 2);
  const rowOne = allTech.slice(0, half);
  const rowTwo = allTech.slice(half);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-clip bg-background text-foreground">
        {/* top bar, same as /apps */}
        <div className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 md:px-8">
            <Link
              to="/"
              className="font-display text-xl tracking-[0.2em] text-foreground transition-colors hover:text-muted-foreground"
            >
              APEX ROOT
            </Link>
            <div className="flex items-center gap-6">
              <Link
                to="/apps"
                className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Our Apps
              </Link>
              <Link
                to="/"
                className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* hero */}
        <header className="relative border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-10 select-none font-display text-[26rem] leading-none md:-right-10 md:text-[34rem]"
            style={{ WebkitTextStroke: "1px hsl(var(--accent) / 0.45)", color: "transparent" }}
          >
            $
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 70% at 85% 30%, hsl(var(--accent) / 0.14), transparent 70%)",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
            <p className={`${eyebrow} mb-4`}>Pricing</p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-6 font-display text-6xl leading-none tracking-wide text-foreground md:text-8xl"
            >
              SERIOUS WORK.
              <br />
              <span className="text-accent">HONEST NUMBERS.</span>
            </motion.h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Every project is scoped on its own, but most land inside the ranges below. Pick the work you need,
              watch the total add up, then tell us about it.
            </p>

            <dl className="mt-14 grid max-w-3xl grid-cols-1 border border-border bg-background/60 backdrop-blur-sm sm:grid-cols-3">
              {[
                { k: "Projects start at", v: money(cheapest), n: "A single-page site" },
                { k: "Projects reach", v: money(biggest), n: "A custom web application" },
                {
                  k: "Hourly work from",
                  v: hourly ? `${money(hourly.min)}/hr` : "",
                  n: "Database administration",
                },
              ].map((s, i) => (
                <div
                  key={s.k}
                  className={`p-6 ${i > 0 ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
                >
                  <dt className={eyebrow}>{s.k}</dt>
                  <dd className="mt-2 font-display text-4xl tracking-wide text-foreground md:text-5xl">{s.v}</dd>
                  <dd className="mt-1 text-xs text-muted-foreground">{s.n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        {/* ladder + estimator */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24" aria-labelledby="ladder-title">
          <div className="mb-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className={`${eyebrow} mb-4`}>The price ladder</p>
              <h2
                id="ladder-title"
                className="font-display text-4xl leading-none tracking-wide text-foreground md:text-6xl"
              >
                BUILD YOUR ESTIMATE
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Tap any service to add it. Each bar shows where that work usually lands; every gridline is ten times
              the one before.
            </p>
          </div>

          <div className="border border-border">
            {/* axis labels */}
            <div className="relative h-9 border-b border-border bg-secondary" aria-hidden>
              <div className="absolute inset-y-0 left-5 right-5">
                {ticks.map((t, i) => (
                  <span
                    key={t.value}
                    className={`absolute top-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] text-muted-foreground ${
                      i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                    }`}
                    style={{ left: `${pos(t.value)}%` }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              {groups.map((g) => {
                const inGroup = services.filter((s) => s.group === g);
                return (
                  <div key={g} role="group" aria-label={g}>
                    <h3 className="relative z-10 flex items-center justify-between border-b border-border bg-secondary px-5 py-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      <span>{g}</span>
                      <span>{inGroup.length}</span>
                    </h3>
                    <ul>
                      {inGroup.map((s) => {
                        counter += 1;
                        return (
                          <LadderRow
                            key={s.id}
                            service={s}
                            index={counter}
                            selected={!!picked[s.id]}
                            onToggle={() => toggle(s.id)}
                            hours={hours}
                            onHours={setHours}
                          />
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {/* gridlines run through every row on the same axis as the bars */}
              <div aria-hidden className="pointer-events-none absolute inset-y-0 left-5 right-5 z-20">
                {ticks.map((t) => (
                  <span
                    key={t.value}
                    className="absolute inset-y-0 w-px bg-foreground/[0.07]"
                    style={{ left: `${pos(t.value)}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* running total */}
          <div className="sticky bottom-4 z-30 mt-6">
            <div
              className={`border bg-background/95 p-5 backdrop-blur transition-colors md:p-6 ${
                chosen.length ? "border-accent" : "border-border"
              }`}
              aria-live="polite"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={eyebrow}>
                    {chosen.length
                      ? `Your estimate · ${chosen.length} ${chosen.length === 1 ? "service" : "services"}`
                      : "Your estimate"}
                  </p>
                  {chosen.length ? (
                    <p className="mt-1 font-display text-4xl tracking-wide text-foreground md:text-5xl">
                      {money(Math.round(shownLow))}
                      <span className="mx-2 text-muted-foreground/60">–</span>
                      <span className="text-accent">{money(Math.round(shownHigh))}</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Select a service above to start adding up.</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {chosen.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPicked({});
                        setHours(DEFAULT_HOURS);
                      }}
                      className="flex items-center gap-2 px-3 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      Clear
                    </button>
                  )}
                  {chosen.length > 0 ? (
                    <a
                      href={mailto}
                      className="flex items-center gap-2 bg-accent px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-accent-foreground transition-colors hover:bg-accent/85"
                    >
                      Email this estimate
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </a>
                  ) : (
                    <Link
                      to="/#contact"
                      className="hidden items-center gap-2 border border-foreground/40 px-6 py-3 md:flex text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                    >
                      Skip to contact
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            A planning estimate, not a quote. Ranges are in US dollars and cover typical scopes; a final price follows
            a short conversation about what you need.
          </p>
        </section>

        {/* toolbox */}
        <section className="border-y border-border bg-secondary py-16 md:py-24" aria-labelledby="stack-title">
          <div className="mx-auto max-w-6xl px-6 md:px-8">
            <p className={`${eyebrow} mb-4`}>The toolbox</p>
            <h2
              id="stack-title"
              className="mb-4 font-display text-4xl leading-none tracking-wide text-foreground md:text-6xl"
            >
              EVERY LAYER OF THE BUILD
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              One studio from the first sketch to the App Store listing. These are the technologies behind the
              prices above.
            </p>
          </div>

          {/* decorative ticker: the same names are listed properly in the grid below */}
          <div
            aria-hidden
            className="mt-14 space-y-4 overflow-hidden"
            style={{
              WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
              maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
            }}
          >
            {[
              { items: rowOne, anim: "animate-marquee", outline: true },
              { items: rowTwo, anim: "animate-marquee-reverse", outline: false },
            ].map((row, r) => (
              <div key={r} className={`flex w-max motion-reduce:animate-none ${row.anim}`}>
                {[0, 1].map((copy) => (
                  <ul key={copy} className="flex shrink-0 items-center">
                    {row.items.map((t) => (
                      <li key={t} className="flex items-center">
                        <span
                          className="whitespace-nowrap px-6 font-display text-5xl tracking-wide md:text-7xl"
                          style={
                            row.outline
                              ? { WebkitTextStroke: "1px hsl(var(--foreground) / 0.6)", color: "transparent" }
                              : { color: "hsl(var(--foreground) / 0.85)" }
                          }
                        >
                          {t}
                        </span>
                        <span className="h-2 w-2 shrink-0 rotate-45 bg-accent" />
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-6xl px-6 md:px-8">
            <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {techGroups.map((g, i) => (
                <motion.div
                  key={g.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: (i % 4) * 0.07 }}
                  className="bg-background p-6"
                >
                  <p className="font-display text-sm text-accent">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-1 font-display text-2xl tracking-wide text-foreground">{g.title}</h3>
                  <p className="mb-5 mt-2 text-xs leading-relaxed text-muted-foreground">{g.note}</p>
                  <ul className="flex flex-wrap gap-2">
                    {g.items.map((t) => (
                      <li
                        key={t}
                        className="border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground/80"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* what moves the price */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24" aria-labelledby="factors-title">
          <p className={`${eyebrow} mb-4`}>Why a range</p>
          <h2
            id="factors-title"
            className="mb-12 font-display text-4xl leading-none tracking-wide text-foreground md:text-6xl"
          >
            WHAT MOVES THE PRICE
          </h2>

          <div className="relative grid gap-px border border-border bg-border md:grid-cols-2">
            <div className="bg-background p-8">
              <p className="mb-6 font-display text-2xl tracking-wide text-foreground">← Toward the low end</p>
              <ul className="space-y-4">
                {lowerEnd.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background p-8">
              <p className="mb-6 font-display text-2xl tracking-wide text-accent">Toward the high end →</p>
              <ul className="space-y-4">
                {upperEnd.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Plus className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* closing call to action */}
        <section className="bg-accent">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20">
            <div>
              <h2 className="font-display text-4xl leading-none tracking-wide text-accent-foreground md:text-6xl">
                GOT AN IDEA?
                <br />
                LET'S PUT A NUMBER ON IT.
              </h2>
              <p className="mt-4 max-w-md text-sm text-accent-foreground/80">
                Tell us what you want to build and we will come back with a clear scope and price.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/#contact"
                className="flex items-center justify-center gap-2 bg-background px-8 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-background/85"
              >
                Start a project
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href="tel:3108496035"
                className="flex items-center justify-center gap-2 border border-accent-foreground/60 px-8 py-4 text-[11px] uppercase tracking-[0.2em] text-accent-foreground transition-colors hover:bg-accent-foreground hover:text-accent"
              >
                <Phone className="h-4 w-4" aria-hidden />
                310-849-6035
              </a>
            </div>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
};

export default Pricing;
