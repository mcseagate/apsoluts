import { useRef, type ElementType, type HTMLAttributes, type PointerEvent, type ReactNode } from "react";

// Wraps a card so a red light follows the pointer across it: a soft glow in
// the fill and a sharper one along the border. The look lives in index.css
// (.spotlight); this only reports where the pointer is.

interface Props extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
  /** Tilts the card toward the pointer, desktop only. */
  tilt?: boolean;
}

const Spotlight = ({ as: Tag = "div", children, className = "", tilt = false, onPointerMove, onPointerLeave, ...rest }: Props) => {
  const ref = useRef<HTMLElement>(null);

  const move = (e: PointerEvent<HTMLElement>) => {
    onPointerMove?.(e);
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    if (tilt && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const rx = (0.5 - y / rect.height) * 8;
      const ry = (x / rect.width - 0.5) * 10;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    }
  };

  const leave = (e: PointerEvent<HTMLElement>) => {
    onPointerLeave?.(e);
    if (tilt && ref.current) ref.current.style.transform = "";
  };

  return (
    <Tag
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`spotlight ${tilt ? "spotlight-tilt" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Spotlight;
