import "framer-motion";

/*
 * framer-motion v12 ships MotionProps without animation-specific fields
 * (initial, animate, whileInView, etc.) because those are added at runtime
 * by the animations feature bundle.  This declaration merges them back in
 * so TypeScript accepts <motion.div initial={...} animate={...} />.
 */
declare module "framer-motion" {
  interface MotionProps {
    initial?: boolean | Record<string, unknown> | string | string[];
    animate?: Record<string, unknown> | string | string[] | boolean;
    exit?: Record<string, unknown> | string | string[];
    whileInView?: Record<string, unknown> | string | string[];
    whileHover?: Record<string, unknown> | string | string[];
    whileTap?: Record<string, unknown> | string | string[];
    whileFocus?: Record<string, unknown> | string | string[];
    whileDrag?: Record<string, unknown> | string | string[];
    transition?: Record<string, unknown>;
    viewport?: {
      once?: boolean;
      margin?: string;
      amount?: number | "some" | "all";
      root?: React.RefObject<Element>;
    };
    variants?: Record<string, Record<string, unknown>>;
  }
}
