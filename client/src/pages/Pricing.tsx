import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowRight, Check, Minus, Phone, Plus, RotateCcw } from "lucide-react";
import ShaderField from "@/components/fx/ShaderField";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { WHATSAPP_DISPLAY, WINDOWS_MESSAGE, whatsappUrl } from "@/data/contact";
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
import { DEFAULT_T, PRESETS, clamp01, nearPreset, scopeLabel, valueAt } from "@/lib/pricePoint";

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

const priceText = (s: Service) => {
  if (s.unit === "whatsapp") return "WHATSAPP US";
  return s.unit === "hour" ? `${money(s.min)}–${money(s.max)}/hour` : `${money(s.min)}–${money(s.max)}`;
};

const eyebrow = "text-[10px] tracking-[0.35em] uppercase text-muted-foreground";

/* ---------- the draggable price point ---------- */

const pointOf = (service: Service, t: number) =>
  valueAt(service.min, service.max, t, service.unit === "hour" ? "linear" : "log");

interface PointBarProps {
  index: number;
  left: number; // where this range starts on the shared axis, in %
  width: number; // how wide the range is, in %
  t: number;
  onChange: (t: number) => void;
  selected: boolean;
  name: string;
  valueText: string;
}

// The bar for one service, with a marker the visitor drags to say how big the
// job is. Pointer events cover mouse, touch and pen; the marker is also a real
// slider for the keyboard and screen readers.
const PointBar = ({ index, left, width, t, onChange, selected, name, valueText }: PointBarProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const percentAt = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 ? ((clientX - rect.left) / rect.width) * 100 : null;
  };
  const move = (clientX: number) => {
    const percent = percentAt(clientX);
    if (percent !== null && width > 0) onChange(clamp01((percent - left) / width));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const percent = percentAt(e.clientX);
    // Only a press on, or just beside, the coloured range starts a drag.
    if (percent === null || percent < left - 3 || percent > left + width + 3) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    thumbRef.current?.focus({ preventScroll: true });
    move(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) move(e.clientX);
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const big = e.key === "PageUp" || e.key === "PageDown";
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "PageUp") next = t + (big ? 0.2 : 0.05);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "PageDown") next = t - (big ? 0.2 : 0.05);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 1;
    if (next !== null) {
      e.preventDefault();
      onChange(clamp01(next));
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative mt-2.5 cursor-pointer touch-pan-y select-none py-2.5"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div className="relative h-3 w-full bg-muted/70">
        {/* the range this service usually covers */}
        <motion.div
          aria-hidden
          className={`absolute inset-y-0 transition-colors ${selected ? "bg-accent/45" : "bg-foreground/25"}`}
          style={{ left: `${left}%`, width: `${width}%`, originX: 0 }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: (index % 4) * 0.06 }}
        />
        {/* the part of it up to the marker */}
        <div
          aria-hidden
          className={`absolute inset-y-0 ${selected ? "bg-accent" : "bg-foreground/55"}`}
          style={{ left: `${left}%`, width: `${t * width}%` }}
        />
        <div
          ref={thumbRef}
          role="slider"
          tabIndex={0}
          aria-label={`${name}: how big is the job`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(t * 100)}
          aria-valuetext={valueText}
          onKeyDown={onKeyDown}
          className="group/thumb absolute top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center outline-none active:cursor-grabbing"
          style={{ left: `${left + t * width}%` }}
        >
          <span
            className={`block h-3.5 w-3.5 rotate-45 border-2 border-background shadow transition-colors group-focus-visible/thumb:outline group-focus-visible/thumb:outline-2 group-focus-visible/thumb:outline-offset-4 group-focus-visible/thumb:outline-foreground ${
              selected ? "bg-accent" : "bg-foreground"
            }`}
          />
        </div>
      </div>
    </div>
  );
};

/* ---------- ladder row ---------- */

interface RowProps {
  service: Service;
  index: number;
  selected: boolean;
  onToggle: () => void;
  t: number;
  onPoint: (t: number) => void;
  hours: number;
  onHours: (n: number) => void;
}

const LadderRow = ({ service, index, selected, onToggle, t, onPoint, hours, onHours }: RowProps) => {
  const isHourly = service.unit === "hour";
  const isChat = service.unit === "whatsapp";
  // WhatsApp rows have no range, so they never touch the log scale
  const left = isChat ? 0 : pos(service.min);
  const width = isChat ? 0 : pos(service.max) - left;
  const value = isChat ? 0 : pointOf(service, t);
  const valueShown = money(value);

  return (
    <li
      className={`group relative z-10 border-b border-border transition-colors last:border-b-0 hover:bg-card ${
        selected ? "bg-card shadow-[inset_2px_0_0_0_hsl(var(--accent))]" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className="block w-full px-5 pt-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
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
      </button>

      {/* everything below sits outside the toggle button: a slider cannot live inside a button */}
      <div className="px-5 pb-6">
        {isHourly || isChat ? (
          <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            {isChat ? "Quoted individually, so it sits off the ladder" : "Billed by the hour, so it sits off the ladder"}
          </p>
        ) : (
          <>
            <PointBar
              index={index}
              left={left}
              width={width}
              t={t}
              onChange={onPoint}
              selected={selected}
              name={service.name}
              valueText={`${scopeLabel(t)} scope, ${valueShown}`}
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div role="group" aria-label={`${service.name}: scope`} className="flex items-center gap-1.5">
                {PRESETS.map((preset) => {
                  const active = nearPreset(t, preset.t);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onPoint(preset.t)}
                      className={`border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors sm:px-2.5 sm:py-1 ${
                        active
                          ? "border-accent text-accent"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="text-foreground">{scopeLabel(t)} scope</span>
                <span aria-hidden> · </span>
                <span className={selected ? "text-accent" : "text-foreground"}>{valueShown}</span>
              </p>
            </div>
          </>
        )}

        <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Built with`}>
          {service.tech.map((tech) => (
            <li
              key={tech}
              className="border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:border-foreground/30"
            >
              {tech}
            </li>
          ))}
        </ul>
      </div>

      <AnimatePresence initial={false}>
        {isChat && selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-4 px-5 pb-6 pl-14">
              <span className="text-xs text-muted-foreground">
                Windows projects vary too much to price from a list. Tell us what you need and we will quote it.
              </span>
              <a
                href={whatsappUrl(WINDOWS_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-accent px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-accent-foreground transition-colors hover:bg-accent/85"
              >
                <WhatsAppIcon size={16} />
                WhatsApp {WHATSAPP_DISPLAY}
              </a>
            </div>
          </motion.div>
        )}
        {isHourly && selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 pb-6 pl-14">
              <div className="flex items-center gap-3">
                <label htmlFor="dba-rate" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Rate you expect
                </label>
                <input
                  id="dba-rate"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(t * 100)}
                  onChange={(e) => onPoint(Number(e.target.value) / 100)}
                  aria-valuetext={`${money(value)} per hour`}
                  className="h-1 w-36 cursor-pointer accent-[hsl(var(--accent))]"
                />
                <span className="w-24 text-xs text-foreground">{money(value)}/hour</span>
              </div>
              <div className="flex items-center gap-3">
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
              </div>
              <span className="text-xs text-foreground">= {money(value * hours)}</span>
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
  // Where the visitor put each service's marker (0 = bottom of its range, 1 = top).
  const [points, setPoints] = useState<Record<string, number>>({});
  const tOf = (id: string) => points[id] ?? DEFAULT_T;

  useEffect(() => {
    const previous = document.title;
    document.title = "Pricing | Apex Root Solutions";
    return () => {
      document.title = previous;
    };
  }, []);

  const chosen = useMemo(() => services.filter((s) => picked[s.id]), [picked]);

  // Call-us services are listed in the estimate but add nothing to the sum.
  const priced = useMemo(() => chosen.filter((s) => s.unit !== "whatsapp"), [chosen]);
  const chatOnes = useMemo(() => chosen.filter((s) => s.unit === "whatsapp"), [chosen]);

  // low and high are the full range of what is chosen; point is the sum of the
  // visitor's markers, which is what the headline total shows.
  const { low, high, point } = useMemo(() => {
    let lo = 0;
    let hi = 0;
    let pt = 0;
    for (const s of priced) {
      const qty = s.unit === "hour" ? hours : 1;
      lo += s.min * qty;
      hi += s.max * qty;
      pt += pointOf(s, points[s.id] ?? DEFAULT_T) * qty;
    }
    return { low: lo, high: hi, point: pt };
  }, [priced, hours, points]);

  const shownPoint = useTween(point);

  const toggle = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  // Moving a marker (or tapping Small/Medium/Large) also adds that service.
  const setPoint = (id: string, t: number) => {
    setPoints((p) => ({ ...p, [id]: clamp01(t) }));
    setPicked((p) => (p[id] ? p : { ...p, [id]: true }));
  };

  const mailto = useMemo(() => {
    const lines = chosen.map((s) => {
      const t = points[s.id] ?? DEFAULT_T;
      if (s.unit === "whatsapp") return `- ${s.name}: price on request`;
      if (s.unit === "hour") {
        const rate = pointOf(s, t);
        return `- ${s.name}: ${hours} hours at about ${money(rate)}/hour = ${money(rate * hours)} (rate range ${money(s.min)}-${money(s.max)})`;
      }
      return `- ${s.name}: ${scopeLabel(t)} scope, about ${money(pointOf(s, t))} (range ${money(s.min)}-${money(s.max)})`;
    });
    const body = [
      "Hello Apex Root,",
      "",
      "I built this estimate on your pricing page:",
      ...lines,
      priced.length
        ? `Estimate: about ${money(point)} (typical range ${money(low)}-${money(high)})${chatOnes.length ? ", plus the items priced on request" : ""}`
        : "Estimate: to be discussed",
      "",
      "A little about my project:",
      "",
    ].join("\n");
    return `mailto:contact@apsoluts.com?subject=${encodeURIComponent("Project estimate")}&body=${encodeURIComponent(body)}`;
  }, [chosen, priced, chatOnes, hours, points, point, low, high]);

  // Continues the running index across groups, one number per service.
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
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <ShaderField intensity={0.7} className="h-full" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
          </div>

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
              Tap a service to add it, then drag its marker along the bar, or tap Small, Medium or Large, to say how
              big the job is. Each bar shows where that work usually lands; every gridline is ten times the one before.
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
                            t={tOf(s.id)}
                            onPoint={(t) => setPoint(s.id, t)}
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
                  {priced.length ? (
                    <>
                      <p className="mt-1 font-display text-4xl tracking-wide text-accent md:text-5xl">
                        {money(Math.round(shownPoint))}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        From the scope you set on each bar. Typical range for these services: {money(low)}–
                        {money(high)}
                      </p>
                      {chatOnes.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Plus {chatOnes.map((s) => s.name.toLowerCase()).join(", ")}, priced over WhatsApp
                        </p>
                      )}
                    </>
                  ) : chatOnes.length ? (
                    <p className="mt-1 font-display text-4xl tracking-wide text-accent md:text-5xl">WHATSAPP US</p>
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
                        setPoints({});
                        setHours(DEFAULT_HOURS);
                      }}
                      className="flex items-center gap-2 px-3 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      Clear
                    </button>
                  )}
                  {chatOnes.length > 0 && (
                    <a
                      href={whatsappUrl(WINDOWS_MESSAGE)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 border border-foreground/40 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                    >
                      <WhatsAppIcon size={16} />
                      WhatsApp us
                    </a>
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
                to="/quote"
                className="flex items-center justify-center gap-2 bg-background px-8 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-background/85"
              >
                Request a quote
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
