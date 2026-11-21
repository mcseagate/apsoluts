import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How long does it take to build a mobile app?",
    answer:
      "The timeline depends on the complexity of your app. A simple app can take 4–8 weeks, while a more feature-rich application may require 3–6 months. During our free consultation, we'll provide a detailed timeline based on your specific requirements.",
  },
  {
    question: "How much does mobile app development cost?",
    answer:
      "Every project is unique, so costs vary based on features, complexity, and platform requirements. We offer competitive pricing and will provide a transparent, detailed quote after understanding your project scope. Contact us for a free estimate.",
  },
  {
    question: "What is your development process?",
    answer:
      "Our process includes five key phases: Discovery & Planning, UI/UX Design, Development, Testing & QA, and Launch & Support. We keep you involved at every stage with regular updates and review sessions.",
  },
  {
    question: "Do you build for both iOS and Android?",
    answer:
      "Yes, we develop for both iOS and Android platforms. Depending on your needs and budget, we can build native apps for each platform or use cross-platform technologies like React Native or Flutter.",
  },
  {
    question: "Do you build Windows desktop software?",
    answer:
      "Yes. We build Windows applications, from internal business tools to commercial software, and take them all the way to a signed installer or a Microsoft Store listing. A Windows app can share the same API and database as your mobile and web apps, so one backend can serve every platform.",
  },
  {
    question: "Do you provide post-launch support and maintenance?",
    answer:
      "Absolutely. We offer ongoing maintenance and support packages to keep your app updated, secure, and performing at its best — including bug fixes, OS compatibility updates, feature enhancements, and performance monitoring.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="bg-background py-28 lg:py-40">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-4">
              Common Questions
            </p>
            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl leading-none tracking-wide text-foreground">
              GOT
              <br />
              QUESTIONS?
            </h2>
            <p className="mt-8 text-muted-foreground text-sm leading-relaxed max-w-xs sm:max-w-sm lg:max-w-xs">
              Here are the questions we get asked most. Don't see yours? Reach
              out directly — we're always happy to help.
            </p>
            <button
              onClick={() =>
                document
                  .querySelector("#contact")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-8 text-[11px] tracking-[0.2em] uppercase text-foreground border-b border-foreground/30 pb-1 hover:border-foreground transition-colors"
            >
              Ask Us Directly →
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="divide-y divide-border border-t border-border">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-none">
                  <AccordionTrigger className="text-left text-foreground hover:no-underline py-6 text-sm tracking-wide hover:text-foreground/70 transition-colors [&>svg]:text-muted-foreground">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
