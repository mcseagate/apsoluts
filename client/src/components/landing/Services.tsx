import { motion } from "framer-motion";
import Spotlight from "@/components/fx/Spotlight";
import { windowsTech } from "@/data/pricing";
import { WHATSAPP_DISPLAY, WINDOWS_MESSAGE, whatsappUrl } from "@/data/contact";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import {
  Smartphone,
  Monitor,
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
    title: "Mobile App Development",
    description:
      "Custom iOS and Android applications built for performance, scale, and real-world users.",
  },
  {
    icon: Monitor,
    title: "Windows Software Development",
    isNew: true,
    tech: windowsTech,
    whatsApp: true,
    description:
      "Desktop applications for Windows, from internal business tools to polished commercial software, delivered with a signed installer or a Microsoft Store listing.",
  },
  {
    icon: Globe,
    title: "Web Design & Development",
    description:
      "Modern, fast, and responsive websites and web applications built to convert visitors into customers.",
  },
  {
    icon: Palette,
    title: "UI/UX Design",
    description:
      "Intuitive, visually refined interfaces crafted to maximize engagement and retention.",
  },
  {
    icon: Code,
    title: "App Consultation",
    description:
      "Strategic roadmapping to align your vision with market reality and technical feasibility.",
  },
  {
    icon: TestTube,
    title: "Testing & QA",
    description:
      "Rigorous quality assurance across devices and platforms before every release.",
  },
  {
    icon: RefreshCw,
    title: "Maintenance & Updates",
    description:
      "Continuous support and optimization to keep your app at peak performance.",
  },
  {
    icon: Rocket,
    title: "Launch Strategy",
    description:
      "App store and Windows distribution, plus go-to-market execution for maximum day-one impact.",
  },
  {
    icon: Server,
    title: "API & Backend Development",
    description:
      "Scalable server-side systems, databases, and third-party integrations that power your product.",
  },
  {
    icon: ShoppingCart,
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
              <span className="text-outline">SERVICES</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            Full-stack digital solutions — from mobile and Windows apps to
            websites, strategy, design, and beyond.
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
              className="bg-secondary"
            >
              <Spotlight className="group h-full p-8 md:p-9 lg:p-10 cursor-default">
                <div className="flex items-start justify-between mb-8">
                  <span className="font-display text-5xl text-muted-foreground/20 group-hover:text-accent/60 transition-colors leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <service.icon className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:scale-110 transition-all mt-1" />
                </div>
                <h3 className="text-foreground font-medium text-base tracking-wide mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {service.title}
                  {service.isNew && (
                    <span className="border border-accent px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.25em] text-accent">
                      New
                    </span>
                  )}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
                {service.tech && (
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Built with">
                    {service.tech.map((t) => (
                      <li
                        key={t}
                        className="border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:border-accent/50"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                {service.whatsApp && (
                  <a
                    href={whatsappUrl(WINDOWS_MESSAGE)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-accent pb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-accent transition-colors hover:text-foreground"
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <WhatsAppIcon size={14} />
                      WhatsApp us for pricing
                    </span>
                    <span className="whitespace-nowrap text-foreground/80">{WHATSAPP_DISPLAY}</span>
                  </a>
                )}
              </Spotlight>
            </motion.div>
          ))}

          {/* closes the grid on every breakpoint: ten cards plus this two-wide tile */}
          <button
            type="button"
            onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
            className="group flex flex-col justify-between gap-10 bg-accent p-8 text-left text-accent-foreground transition-colors hover:bg-accent/90 md:col-span-2 md:p-9 lg:p-10"
          >
            <span className="font-display text-4xl leading-none tracking-wide md:text-5xl">
              SOMETHING ELSE IN MIND?
            </span>
            <span className="flex items-center justify-between gap-6 text-sm">
              Tell us what you need built and we will tell you how.
              <span aria-hidden className="text-2xl transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Services;
