import { motion } from "framer-motion";
import {
  Smartphone,
  Palette,
  Code,
  TestTube,
  RefreshCw,
  Rocket,
  Globe,
  Server,
  ShoppingCart,
} from "lucide-react";

const services = [
  {
    icon: Smartphone,
    number: "01",
    title: "Mobile App Development",
    description:
      "Custom iOS and Android applications built for performance, scale, and real-world users.",
  },
  {
    icon: Globe,
    number: "02",
    title: "Web Design & Development",
    description:
      "Modern, fast, and responsive websites and web applications built to convert visitors into customers.",
  },
  {
    icon: Palette,
    number: "03",
    title: "UI/UX Design",
    description:
      "Intuitive, visually refined interfaces crafted to maximize engagement and retention.",
  },
  {
    icon: Code,
    number: "04",
    title: "App Consultation",
    description:
      "Strategic roadmapping to align your vision with market reality and technical feasibility.",
  },
  {
    icon: TestTube,
    number: "05",
    title: "Testing & QA",
    description:
      "Rigorous quality assurance across devices and platforms before every release.",
  },
  {
    icon: RefreshCw,
    number: "06",
    title: "Maintenance & Updates",
    description:
      "Continuous support and optimization to keep your app at peak performance.",
  },
  {
    icon: Rocket,
    number: "07",
    title: "Launch Strategy",
    description:
      "App store optimization and go-to-market execution for maximum day-one impact.",
  },
  {
    icon: Server,
    number: "08",
    title: "API & Backend Development",
    description:
      "Scalable server-side systems, databases, and third-party integrations that power your product.",
  },
  {
    icon: ShoppingCart,
    number: "09",
    title: "E-Commerce Development",
    description:
      "Full-featured online stores with secure payment processing, inventory management, and seamless checkout.",
  },
];

const Services = () => {
  return (
    <section id="services" className="bg-secondary py-28 lg:py-40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 lg:mb-24 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8"
        >
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-4">
              What We Do
            </p>
            <h2 className="font-display text-5xl md:text-7xl lg:text-9xl leading-none tracking-wide text-foreground">
              OUR
              <br />
              SERVICES
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            Full-stack digital solutions — from mobile apps and websites to
            strategy, design, and beyond.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              viewport={{ once: true }}
              className="group bg-secondary p-8 md:p-9 lg:p-10 hover:bg-card transition-colors duration-300 cursor-default"
            >
              <div className="flex items-start justify-between mb-8">
                <span className="font-display text-5xl text-muted-foreground/20 group-hover:text-muted-foreground/30 transition-colors leading-none">
                  {service.number}
                </span>
                <service.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
              </div>
              <h3 className="text-foreground font-medium text-base tracking-wide mb-3">
                {service.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
