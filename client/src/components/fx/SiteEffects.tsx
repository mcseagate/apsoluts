import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useLocation } from "react-router-dom";

// Two site-wide touches: a red progress line along the top edge that fills as
// the page is read, and, on devices with a real pointer, a faint red light that
// trails the cursor.

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-accent shadow-[0_0_12px_2px_hsl(var(--accent)/0.7)]"
      style={{ scaleX }}
    />
  );
};

const CursorGlow = () => {
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: -400, y: -400 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
    let raf = 0;
    let next = { x: -400, y: -400 };
    const onMove = (e: PointerEvent) => {
      next = { x: e.clientX, y: e.clientY };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          setPos(next);
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[520px] w-[520px] rounded-full mix-blend-screen transition-transform duration-300 ease-out"
      style={{
        transform: `translate3d(${pos.x - 260}px, ${pos.y - 260}px, 0)`,
        background: "radial-gradient(circle, hsl(var(--accent) / 0.16), transparent 62%)",
      }}
    />
  );
};

// Moving to another page starts at its top; moving within a page (a #hash) does not.
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);
  return null;
};

// Focused pages (the ad landing page) keep the scroll reset but skip the decoration.
const QUIET_ROUTES = ["/web-app-landing"];

const SiteEffects = () => {
  const { pathname } = useLocation();
  const quiet = QUIET_ROUTES.includes(pathname);
  return (
    <>
      <ScrollToTop />
      {!quiet && <ScrollProgress />}
      {!quiet && <CursorGlow />}
    </>
  );
};

export default SiteEffects;
