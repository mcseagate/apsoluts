import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Spotlight from "@/components/fx/Spotlight";

const stats = [
  { value: 50, suffix: "+", label: "Projects Delivered" },
  { value: 100, suffix: "%", label: "Client Satisfaction" },
  { value: 24, suffix: "/7", label: "Support Available" },
  { value: 5, suffix: "+", label: "Years Experience" },
];

const CountUp = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const startTime = performance.now();
    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic so it decelerates naturally
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count}
      <span className="text-accent">{suffix}</span>
    </span>
  );
};

const About = () => {
  return (
    <section id="about" className="bg-background py-28 lg:py-40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 md:gap-20 lg:gap-28 items-start">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-6">
              About Us
            </p>
            <h2 className="font-display text-5xl md:text-7xl lg:text-9xl leading-none tracking-wide text-foreground mb-10">
              WHO
              <br />
              <span className="text-outline">WE ARE</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              Apex Root Solutions LLC is a technology company rooted in
              innovation. We specialize in designing and developing mobile and
              web applications that help businesses and entrepreneurs connect
              with their customers, streamline operations, and accelerate
              growth.
            </p>
            <p className="text-muted-foreground leading-relaxed text-base mt-4">
              From concept to launch, our team works closely with you to
              transform your vision into a powerful digital product that users
              love.
            </p>
            <button
              onClick={() =>
                document
                  .querySelector("#contact")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-10 text-[11px] tracking-[0.2em] uppercase text-foreground border-b border-foreground/30 pb-1 hover:border-foreground transition-colors"
            >
              Get In Touch →
            </button>
          </motion.div>

          {/* Right: stat grid with hairline borders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                viewport={{ once: true }}
                className="bg-background"
              >
                <Spotlight className="h-full p-8 md:p-10 lg:p-12">
                  <div className="font-display text-5xl md:text-6xl lg:text-7xl text-foreground leading-none">
                    <CountUp target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="mt-3 text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                    {stat.label}
                  </p>
                </Spotlight>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
