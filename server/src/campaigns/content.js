// The words in the campaign emails. They rotate in this order, one topic per
// email, so a subscriber hears about a different part of the business each time.
//
// Rules this file keeps, so it stays safe to send without a person reading each one:
//   * No prices. Prices live on the pricing page (data/pricing.ts in the client);
//     copying numbers here would let the two drift apart. Emails send people to
//     /pricing instead. The only figure that appears is the holiday offer, which
//     comes from campaigns/offers.js.
//   * Technology names come from the lists on the site's pricing page.
//   * Security and quality statements are written as specific practices, never as
//     guarantees. No certifications or named standards are claimed, and nothing says
//     a product "cannot be hacked" or is "uncompromised": nobody can honestly promise
//     that. CLAIMS TO CONFIRM marks the statements the owner must be able to stand
//     behind for the work they sell; edit or remove any that are not true for you.

export const TOPICS = [
  {
    id: "services",
    subject: "Web, mobile and Windows software, built by one team",
    heading: "What Apex Root Solutions builds",
    intro:
      "We design and build custom software for businesses and entrepreneurs, and we stay with it after launch.",
    bullets: [
      "Web applications: dashboards, portals, internal tools and SaaS products.",
      "iOS and Android apps, shipped through the App Store and Google Play.",
      "Windows desktop software, delivered with a signed installer or a Microsoft Store listing.",
      "Backends and APIs, e-commerce stores, and real-time features such as live calls and chat.",
    ],
    cta: { label: "View services & pricing", path: "/pricing" },
  },
  {
    id: "web",
    subject: "Web applications built around how you work",
    heading: "Web applications that fit your business",
    intro:
      "Off-the-shelf tools make you work their way. We build the application around how your team and customers actually work.",
    bullets: [
      "Dashboards, customer portals, internal tools and software products.",
      "Built with tools such as React, TypeScript, Node.js, PostgreSQL and Docker.",
      "You agree the scope and a price range before any code is written, and you see a working build every week.",
    ],
    cta: { label: "See web application pricing", path: "/pricing" },
  },
  {
    id: "mobile",
    subject: "iOS and Android apps, native or cross-platform",
    heading: "Mobile apps for iPhone and Android",
    intro:
      "We build native apps for each platform or use cross-platform technology, depending on your needs and budget.",
    bullets: [
      "Native with SwiftUI, Kotlin and Jetpack Compose, or cross-platform with Flutter, Expo and React Native.",
      "We prepare the App Store and Google Play listings and handle the review process.",
      "One backend can serve your phone apps, your website and your Windows software.",
    ],
    cta: { label: "See mobile app pricing", path: "/pricing" },
  },
  {
    id: "security",
    subject: "How we build with security in mind",
    heading: "Security is part of how we build",
    intro:
      "No one can promise software will never be attacked, so we focus on the habits that prevent the common failures and limit the damage when something goes wrong.",
    // CLAIMS TO CONFIRM: each line must be true of the work you deliver.
    bullets: [
      "Secrets and API keys stay on the server, never inside the app or website code.",
      "Input is validated on the server, not just in the browser.",
      "Payments go through hosted providers such as Stripe, so card details never touch your own servers.",
      "Payment confirmations are checked against signed events from the provider, not trusted from a browser redirect.",
      "Access to administration screens is checked on the server on every request.",
    ],
    cta: { label: "Talk to us about your project", path: "/quote" },
  },
  {
    id: "windows",
    subject: "Windows software, built properly",
    heading: "Desktop software for Windows",
    intro:
      "From internal business tools to commercial software, we build Windows applications and take them all the way to release.",
    bullets: [
      "Built on .NET and WinUI.",
      "Delivered with a signed installer or a Microsoft Store listing.",
      "Shares the same API and database as your web and mobile apps, so one backend serves every platform.",
      "Windows projects are quoted individually: ask us for a price.",
    ],
    cta: { label: "Request a quote", path: "/quote" },
  },
  {
    id: "quality",
    subject: "How we check our work before it ships",
    heading: "Built to a standard, and checked",
    intro: "Good software is the result of habits you can see. These are ours.",
    // CLAIMS TO CONFIRM
    bullets: [
      "Testing on real devices and real networks before every release, including slow connections and older hardware.",
      "A working build every week, so you can see progress instead of waiting for a reveal.",
      "A written Project Agreement that sets the scope, deliverables, timeline and fees.",
      "Defects in our work reported within 30 days of final delivery are corrected at no extra charge.",
    ],
    cta: { label: "Read how a project works", path: "/web-app-landing" },
  },
  {
    id: "backend",
    subject: "One backend behind every platform",
    heading: "APIs and backends that your apps can rely on",
    intro:
      "A clean backend is what lets a web app, a phone app and a Windows program share the same data without duplicating work.",
    bullets: [
      "Authentication, business logic, queues and an API built with tools such as Node.js, PostgreSQL, Supabase and Docker.",
      "Database setup, tuning, backups and migrations.",
      "Connections to the third-party services your product needs.",
    ],
    cta: { label: "See backend services", path: "/pricing" },
  },
  {
    id: "process",
    subject: "From first call to launch: how a project runs",
    heading: "Four steps from idea to launch",
    intro: "Here is how a project with us works.",
    bullets: [
      "Discuss your requirements: your goals, your users and your limits.",
      "Agree scope and price: written down before any code exists.",
      "Design and development: a clickable prototype first, then working builds every week.",
      "Launch and support: we release it, then stay on to keep it fast and current.",
    ],
    cta: { label: "Start with a quote request", path: "/quote" },
  },
  {
    id: "ecommerce",
    subject: "Online stores that are ready for real payments",
    heading: "E-commerce built for checkout",
    intro:
      "A store is a catalogue, a cart, a checkout and a way to handle orders. We build all four and connect them to a payment provider.",
    bullets: [
      "Built with tools such as Next.js, TypeScript, PostgreSQL and Stripe.",
      "Hosted checkout, so customers pay on the provider's secure page.",
      "Order handling and an admin screen to run the store.",
    ],
    cta: { label: "See store pricing", path: "/pricing" },
  },
  {
    id: "support",
    subject: "After launch: keeping your software healthy",
    heading: "Support does not end at launch",
    intro: "Software needs looking after. We offer maintenance and support so it stays secure and current.",
    bullets: [
      "Bug fixes and compatibility updates when phones and operating systems change.",
      "Feature enhancements as your needs grow.",
      "Performance monitoring, so slow spots are found before your customers find them.",
    ],
    cta: { label: "Ask about support", path: "/quote" },
  },
];

export const topicFor = (sequence) => TOPICS[(Math.max(1, sequence) - 1) % TOPICS.length];
