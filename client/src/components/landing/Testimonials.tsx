import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "Apex Root Solutions transformed our business idea into a beautiful, functional app. Their team was professional, responsive, and delivered exactly what we needed.",
    name: "Sarah Mitchell",
    company: "GreenLeaf Wellness",
  },
  {
    quote:
      "Working with Apex Root was a game-changer. They understood our vision from day one and built an app that our customers absolutely love.",
    name: "James Carter",
    company: "UrbanEats Delivery",
  },
  {
    quote:
      "The team went above and beyond. From the initial consultation to post-launch support, they were with us every step of the way.",
    name: "Maria Rodriguez",
    company: "FitTrack Pro",
  },
];

const Testimonials = () => {
  return (
    <section className="bg-secondary py-28 lg:py-40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 lg:mb-24"
        >
          <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-4">
            Client Feedback
          </p>
          <h2 className="font-display text-5xl md:text-7xl lg:text-9xl leading-none tracking-wide text-foreground">
            WHAT THEY
            <br />
            SAY
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-secondary p-8 md:p-9 lg:p-10"
            >
              <p className="text-foreground/75 text-sm leading-relaxed mb-10">
                "{t.quote}"
              </p>
              <div className="border-t border-border pt-6">
                <p className="text-foreground font-medium tracking-wide text-sm">
                  {t.name}
                </p>
                <p className="text-muted-foreground text-[10px] tracking-[0.25em] uppercase mt-1">
                  {t.company}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
