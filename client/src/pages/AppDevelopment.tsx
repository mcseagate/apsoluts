import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { money, services } from "@/data/pricing";
import { apps } from "@/data/apps";
import {
  BUSINESS_ADDRESS,
  BUSINESS_EMAIL,
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
  APP_DEVELOPMENT_MESSAGE,
  WINDOWS_MESSAGE,
  WHATSAPP_DISPLAY,
  whatsappUrl,
} from "@/data/contact";
import { appDevelopmentSeo } from "@/data/seo";
import { useSeo } from "@/lib/useSeo";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Landing page for visitors arriving from ads. It explains the web, mobile and
// Windows development services and sends them to /pricing. Everything factual on it comes from the
// site's own sources: prices from data/pricing.ts, apps from data/apps.ts, process,
// policies and contact details from the existing pages and the Terms of Service.

// The services on /pricing shown here, in order, with the platform each one is for.
const OFFERED: { id: string; platform: string }[] = [
  { id: "web-app", platform: "Web" },
  { id: "mobile", platform: "iOS & Android" },
  { id: "windows", platform: "Windows" },
  { id: "ecommerce", platform: "Web" },
  { id: "multi-page", platform: "Web" },
  { id: "backend", platform: "Backend" },
  { id: "integration", platform: "Backend" },
  { id: "realtime", platform: "Real-time" },
];
const offered = OFFERED.flatMap(({ id, platform }) => {
  const service = services.find((s) => s.id === id);
  return service ? [{ service, platform }] : [];
});
const priceOf = (id: string) => services.find((s) => s.id === id);
const webApp = priceOf("web-app");
const mobileApp = priceOf("mobile");

const btnBase =
  "inline-flex min-h-12 items-center justify-center gap-2 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const btnPrimary = `${btnBase} bg-accent text-accent-foreground hover:bg-accent/90`;
const btnOutline = `${btnBase} border border-foreground/50 text-foreground hover:bg-foreground hover:text-background`;

const steps = [
  {
    title: "Discuss your requirements",
    body: "We start with your goals, your users and your limits, so we understand what the software has to do.",
  },
  {
    title: "Agree scope and price",
    body: "We agree the scope and a price range before any code exists. Scope, deliverables, timeline and fees go into a written Project Agreement.",
  },
  {
    title: "Design and development",
    body: "You see a clickable prototype before we commit to building, then a working build every week. We test on real devices and networks before release.",
  },
  {
    title: "Launch and support",
    body: "We prepare the App Store and Google Play listings, or a signed Windows installer or Microsoft Store listing, handle review and push the release live. Then we stay on to keep it fast and current. We correct defects in our work reported within 30 days of final delivery at no extra charge.",
  },
];

const benefits = [
  { title: "Scope and price first", body: "You know what you are getting, and roughly what it costs, before any code is written." },
  { title: "Progress you can see", body: "A working build every week, not a reveal at the end." },
  { title: "One backend, every platform", body: "The same API and database can serve your web app, mobile apps and Windows software." },
];

const faqs = [
  {
    q: "Which platforms do you build for?",
    a: "Web applications, iOS and Android apps, and Windows desktop software. For phones we build native apps for each platform or use cross-platform technologies such as Flutter, Expo or React Native, depending on your needs and budget. For Windows we build on .NET and WinUI and deliver a signed installer or a Microsoft Store listing. One API and database can serve all of them.",
  },
  {
    q: "What is included, and what if the scope changes?",
    a: "The scope, deliverables, timeline and pricing for each project are written into a Project Agreement that both sides sign. If you want to add, change or remove features after that, you request it in writing, and it may change the timeline and cost. We can also decline a project.",
  },
  {
    q: "How long will it take?",
    a: "It depends on the features and complexity. We do not quote a timeline before we understand your requirements: it is agreed in your written proposal.",
  },
  {
    q: "How do revisions work?",
    a: "We share work for review through the project, so you can give feedback at each stage. Changes to the agreed scope are requested in writing. Separately, we correct any defect in our work reported within 30 days of final delivery at no additional charge.",
  },
  {
    q: "How do payments and milestones work?",
    a: "Unless agreed otherwise in writing, a deposit (typically 50% of the project fee) is due before work begins. The balance is due on completion or on the milestone schedule in your Project Agreement. We issue an invoice for each payment, due within 14 days unless stated otherwise, and invoices can be paid online. Fees are in U.S. dollars and do not include third-party costs such as hosting, domains, app store accounts, software licenses or API fees unless the agreement says so.",
  },
  {
    q: "Do you support the software after launch?",
    a: "Yes. We offer maintenance and support, including bug fixes, OS and platform compatibility updates, feature enhancements and performance monitoring. Ask us for the details when you request your quote.",
  },
  {
    q: "Who owns the code?",
    a: "On receipt of full payment, we assign you the rights to the custom deliverables created specifically for your project, including source code, designs and written content. We keep our pre-existing tools and frameworks and license them to you as part of your deliverables. The Terms of Service have the full wording.",
  },
];

const Section = ({ id, label, title, children }: { id: string; label: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={`${id}-title`} className="border-t border-border/60 py-16 md:py-24">
    <div className="mx-auto max-w-5xl px-6">
      <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <h2 id={`${id}-title`} className="mb-10 font-display text-4xl leading-none tracking-wide md:text-6xl">
        {title}
      </h2>
      {children}
    </div>
  </section>
);

const AppDevelopment = () => {
  useSeo(appDevelopmentSeo);
  // Keeps whatever campaign parameters the visitor arrived with (utm_*, fbclid and
  // so on) on the links into the rest of the site. Nothing is stored or sent from here.
  const { search } = useLocation();
  const pricing = { pathname: "/pricing", search };
  const quote = { pathname: "/quote", search };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-foreground focus:px-4 focus:py-3 focus:text-background"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/" className="inline-flex min-h-11 items-center font-display text-xl tracking-[0.2em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
            APEX ROOT
          </Link>
          <Link to={pricing} data-cta="view-services-pricing" data-cta-place="header" className={`${btnPrimary} !min-h-10 !px-4 !py-2 text-[11px]`}>
            Services &amp; Pricing
          </Link>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="bg-[radial-gradient(ellipse_at_top,hsl(0_70%_18%/0.55),transparent_65%)] py-16 md:py-28">
          <div className="mx-auto max-w-5xl px-6">
            <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">App development</p>
            <h1 id="hero-title" className="max-w-3xl font-display text-5xl leading-[0.95] tracking-wide sm:text-6xl md:text-8xl">
              WEB, MOBILE AND WINDOWS APPS <span className="text-accent">BUILT AROUND HOW YOUR BUSINESS WORKS</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-foreground/85 md:text-lg">
              Apex Root Solutions builds web applications, iOS and Android apps, and Windows software for businesses and entrepreneurs.
              You agree the scope and a price range before any code is written, and you see a working build every week.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to={pricing} data-cta="view-services-pricing" data-cta-place="hero" className={btnPrimary}>
                View Services &amp; Pricing
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to={quote} data-cta="request-quote" data-cta-place="hero" className={btnOutline}>
                Request a quote
              </Link>
            </div>
            {webApp && mobileApp && (
              <p className="mt-6 max-w-xl text-sm text-muted-foreground">
                Web applications start from {money(webApp.min)} and mobile apps from {money(mobileApp.min)}. Windows software is quoted
                individually. Every custom project needs a written quote.
              </p>
            )}
          </div>
        </section>

        <Section id="benefits" label="Why it works" title="WHAT YOU GET">
          <ul className="grid gap-px bg-border md:grid-cols-3">
            {benefits.map((b) => (
              <li key={b.title} className="bg-background p-6 md:p-8">
                <h3 className="mb-2 text-base font-medium">{b.title}</h3>
                <p className="text-sm leading-relaxed text-foreground/80">{b.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="services" label="Services" title="WHAT WE BUILD AND WHAT IT COSTS">
          <ul className="grid gap-4 sm:grid-cols-2">
            {offered.map(({ service: s, platform }) => (
              <li key={s.id} className="flex flex-col border border-border bg-card/30 p-6">
                <p className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground/80"><span aria-hidden className="h-2 w-2 bg-accent" />{platform}</p>
                <h3 className="text-base font-medium">{s.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/80">{s.blurb}</p>
                {s.unit === "whatsapp" ? (
                  // Windows work has no listed price: it is quoted over WhatsApp, as on /pricing.
                  <div className="mt-5">
                    <p className="font-display text-3xl tracking-wide">Quoted individually</p>
                    <a
                      href={whatsappUrl(WINDOWS_MESSAGE)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center gap-2 border-b border-accent text-xs uppercase tracking-[0.18em] text-foreground hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                    >
                      <WhatsAppIcon size={14} />
                      Ask for a price on WhatsApp
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                ) : (
                  <p className="mt-5 font-display text-3xl tracking-wide">
                    <span className="mr-1 font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">From</span>{" "}
                    {money(s.min)}
                  </p>
                )}
                <ul aria-label="Usually built with" className="mt-4 flex flex-wrap gap-2">
                  {s.tech.map((t) => (
                    <li key={t} className="border border-border px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-foreground/75">
                      {t}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground/80">
            Starting prices are the low end of a typical range. Custom projects are priced to their scope and need a quote. Windows
            software is quoted individually. The pricing page shows the full ranges and an estimator.
          </p>
          <Link to={pricing} data-cta="view-services-pricing" data-cta-place="services" className={`${btnPrimary} mt-8`}>
            View Services &amp; Pricing
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Section>

        <Section id="process" label="How it works" title="FROM FIRST CALL TO LAUNCH">
          <ol className="grid gap-px bg-border md:grid-cols-2">
            {steps.map((step, i) => (
              <li key={step.title} className="bg-background p-6 md:p-8">
                <p className="mb-3 font-display text-4xl text-accent">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mb-2 text-base font-medium">{step.title}</h3>
                <p className="text-sm leading-relaxed text-foreground/80">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="published" label="Track record" title="APPS WE HAVE PUBLISHED">
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-foreground/80">
            These iOS and Android apps are published by Apex Root Solutions on the App Store or Google Play.
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {apps.map((app) => (
              <li key={app.slug} className="flex items-center gap-3">
                <img
                  src={`/apps/${app.slug}.jpg`}
                  alt={`${app.name} app icon`}
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{app.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{app.category}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link to="/apps" className="mt-6 inline-flex min-h-11 items-center border-b border-foreground/40 text-xs uppercase tracking-[0.2em] hover:border-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
            See our apps
          </Link>
        </Section>

        <Section id="faq" label="Common questions" title="FAQ">
          <Accordion type="single" collapsible className="max-w-3xl">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`} className="border-border">
                <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="pb-6 text-sm leading-relaxed text-foreground/80">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-6 text-sm text-foreground/80">
            Full details are in our{" "}
            <Link to="/terms-of-service" className="underline underline-offset-4 hover:text-accent">Terms of Service</Link>.
          </p>
        </Section>

        <Section id="next" label="Next step" title="SEE WHAT IT WOULD COST">
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-foreground/85">
            Look through the services and price ranges, try the estimator, then tell us about your project. We reply with questions or a
            written proposal.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={pricing} data-cta="view-services-pricing" data-cta-place="footer-cta" className={btnPrimary}>
              View Services &amp; Pricing
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to={quote} data-cta="request-quote" data-cta-place="footer-cta" className={btnOutline}>
              Request a quote
            </Link>
          </div>
        </Section>
      </main>

      <footer className="border-t border-border/60 py-12">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 md:grid-cols-2">
          <address className="space-y-1 text-sm not-italic">
            <p className="font-medium">Apex Root Solutions LLC</p>
            <a href={BUSINESS_PHONE_TEL} className="flex min-h-11 items-center gap-3 text-foreground/80 hover:text-foreground">
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              {BUSINESS_PHONE_DISPLAY}
            </a>
            <a href={`mailto:${BUSINESS_EMAIL}`} className="flex min-h-11 items-center gap-3 text-foreground/80 hover:text-foreground">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              {BUSINESS_EMAIL}
            </a>
            <a href={whatsappUrl(APP_DEVELOPMENT_MESSAGE)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 text-foreground/80 hover:text-foreground">
              <WhatsAppIcon size={16} />
              <span>
                WhatsApp {WHATSAPP_DISPLAY}
                <span className="sr-only"> (opens in a new tab)</span>
              </span>
            </a>
            <p className="flex items-start gap-3 text-foreground/80">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {BUSINESS_ADDRESS}
            </p>
          </address>
          <nav aria-label="Legal and site links" className="flex flex-wrap items-start gap-x-6 text-sm md:justify-end">
            <Link to="/privacy-policy" className="inline-flex min-h-11 items-center text-foreground/80 underline underline-offset-4 hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms-of-service" className="inline-flex min-h-11 items-center text-foreground/80 underline underline-offset-4 hover:text-foreground">Terms of Service</Link>
            <Link to="/" className="inline-flex min-h-11 items-center text-foreground/80 underline underline-offset-4 hover:text-foreground">Home</Link>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-5xl px-6 text-xs text-muted-foreground">© 2026 Apex Root Solutions LLC. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AppDevelopment;
