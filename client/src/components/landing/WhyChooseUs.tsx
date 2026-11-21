import { motion } from "framer-motion";

const features = [
  {
    number: "01",
    title: "Clean & Modern Design",
    description:
      "Visually stunning apps that reflect your brand identity and create lasting impressions on every user.",
  },
  {
    number: "02",
    title: "User-Centric Approach",
    description:
      "Every decision guided by your users' needs to create natural, intuitive, and frictionless experiences.",
  },
  {
    number: "03",
    title: "Business-Focused Strategy",
    description:
      "Solutions engineered around your growth objectives, with every feature tied to measurable outcomes.",
  },
  {
    number: "04",
    title: "Quality Delivery",
    description:
      "Rigorous standards and meticulous attention to detail to deliver robust, scalable apps on time.",
  },
  {
    number: "05",
    title: "Dedicated Support",
    description:
      "Our partnership continues beyond launch — ongoing maintenance and guidance to ensure lasting success.",
  },
];

const WhyChooseUs = () => {
  return (
    <section id="why-choose-us" className="bg-background py-28 lg:py-40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 lg:mb-24"
        >
          <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-4">
            Why Us
          </p>
          <h2 className="font-display text-5xl md:text-7xl lg:text-9xl leading-none tracking-wide text-foreground">
            THE APEX
            <br />
            <span className="text-outline">DIFFERENCE</span>
          </h2>
        </motion.div>

        <div className="divide-y divide-border border-t border-border">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="group relative before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:origin-top before:scale-y-0 before:bg-accent before:transition-transform before:duration-300 hover:before:scale-y-100 flex flex-col md:flex-row md:items-center gap-6 lg:gap-16 px-0 py-8 lg:py-10 hover:bg-secondary/50 transition-colors duration-300 cursor-default -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-6 lg:px-12"
            >
              <span className="font-display text-3xl text-foreground/20 group-hover:text-accent transition-colors flex-shrink-0 w-12 leading-none">
                {feature.number}
              </span>
              <h3 className="font-display text-2xl lg:text-3xl tracking-wide text-foreground flex-shrink-0 lg:w-72 leading-tight">
                {feature.title.toUpperCase()}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                {feature.description}
              </p>
              <span className="hidden md:block text-foreground/20 group-hover:text-accent group-hover:translate-x-1 transition-all text-lg flex-shrink-0 font-light">
                →
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
