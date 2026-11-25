// The words in the campaign emails. They rotate in this order, one topic per
// email, so a subscriber hears about a different part of the business each time.
//
// Each topic is laid out the same way (see compose.js): a small eyebrow line, a
// serif headline, one or two short paragraphs, a list of items with a bold title
// and a line of description, and one button.
//
// Rules this file keeps, so it stays safe to send without a person reading each one:
//   * No prices. Prices live on the pricing page (data/pricing.ts in the client);
//     copying numbers here would let the two drift apart. Emails send people to
//     /pricing instead. The only figure that appears is the holiday offer, which
//     comes from campaigns/offers.js.
//   * Technology names come from the lists on the site's pricing page.
//   * Security and quality statements are specific practices, never guarantees or
//     absolutes. No certifications or named standards are claimed, and nothing says a
//     product "cannot be hacked", is "uncompromised", or that something "never" or
//     "always" happens: nobody can honestly promise that. Where a practice is
//     demonstrated by Apex Root's own systems the wording says so.
//   * Every item in the security and quality topics carries a `source`: where the
//     statement is backed up (a section of the Terms of Service, wording published on
//     the site, or code and tests in this repository). The source is not shown in the
//     email. A test fails if an item has none, or uses an absolute word. If you add an
//     item you cannot point to evidence for, leave it out.

export const TOPICS = [
  {
    id: "services",
    subject: "Web, mobile and Windows software, built by one team",
    eyebrow: "For your next big idea",
    heading: "Something worth building together.",
    paragraphs: [
      "If there is an application you have been meaning to build, or a business process you want to improve, we would love to hear about it.",
      "We design and develop custom software for businesses and entrepreneurs, and we stay with it after launch.",
    ],
    items: [
      { title: "Web applications", body: "Dashboards, client portals, internal tools and SaaS products." },
      { title: "Mobile apps", body: "iOS and Android apps for the App Store and Google Play." },
      { title: "Desktop software", body: "Windows software with a signed installer or Microsoft Store listing." },
      { title: "Connected experiences", body: "Backends, APIs, e-commerce, live calls and chat." },
    ],
    cta: { label: "View services & pricing", path: "/pricing" },
  },
  {
    id: "web",
    subject: "Web applications built around how you work",
    eyebrow: "Web applications",
    heading: "Software that fits the way you work.",
    paragraphs: [
      "Off-the-shelf tools ask you to work their way. We build the application around how your team and your customers actually work.",
    ],
    items: [
      { title: "Dashboards, portals and tools", body: "Customer portals, internal tools and software products." },
      { title: "Proven technology", body: "Built with tools such as React, TypeScript, Node.js, PostgreSQL and Docker." },
      { title: "Scope and price first", body: "You agree the scope and a price range before any code is written." },
      { title: "Progress you can see", body: "A working build every week, not a reveal at the end." },
    ],
    cta: { label: "See web application pricing", path: "/pricing" },
  },
  {
    id: "mobile",
    subject: "iOS and Android apps, native or cross-platform",
    eyebrow: "Mobile apps",
    heading: "Made for the phone in your pocket.",
    paragraphs: [
      "We build native apps for each platform or use cross-platform technology, depending on your needs and your budget.",
    ],
    items: [
      { title: "Native or cross-platform", body: "SwiftUI, Kotlin and Jetpack Compose, or Flutter, Expo and React Native." },
      { title: "Ready for the stores", body: "We prepare the App Store and Google Play listings and handle the review process." },
      { title: "One backend", body: "The same API can serve your phone apps, your website and your Windows software." },
    ],
    cta: { label: "See mobile app pricing", path: "/pricing" },
  },
  {
    id: "security",
    subject: "How we build with security in mind",
    eyebrow: "Security and care",
    heading: "Security is part of how we build.",
    paragraphs: [
      "No one can promise software will not be attacked. So we focus on the habits that prevent the common failures, and that limit the damage when something goes wrong.",
    ],
    items: [
      {
        title: "Secret keys stay on the server",
        body: "We keep secret keys on the server, not in the app or website code. Only public identifiers meant for the browser or the phone are shipped.",
        source: "Apex Root's invoicing system: Stripe secret key is server-only, and tests assert it is absent from responses and logs (server/test/payments.test.js).",
      },
      {
        title: "Input is validated on the server",
        body: "The server checks what it receives instead of trusting the browser or the app.",
        source: "server/src/lib/validate.js and the quote-form and invoicing tests.",
      },
      {
        title: "Card details go straight to the provider",
        body: "With a hosted checkout such as Stripe's, card details go straight to the provider and do not reach your servers.",
        source: "Apex Root's invoicing system uses Stripe hosted Checkout; the pricing page lists Stripe for e-commerce.",
      },
      {
        title: "Payments are confirmed at the source",
        body: "On our own invoicing system, a payment counts only once the provider's signed event confirms it, not because someone reached a thank-you page.",
        source: "server/src/controllers/webhooks/stripe.js (signature verification) and services/payments.js; tests in server/test/payments.test.js.",
      },
      {
        title: "Admin access is enforced on the server",
        body: "Sign-in is checked on the server for each administration request, so a hidden button is not the only protection.",
        source: "server/src/middleware/requireAdmin.js; tests assert a 401 for every admin route without a valid token (server/test/workflow.test.js).",
      },
    ],
    cta: { label: "Talk to us about your project", path: "/quote" },
  },
  {
    id: "windows",
    subject: "Windows software, built properly",
    eyebrow: "Desktop software",
    heading: "Windows software, finished properly.",
    paragraphs: [
      "From internal business tools to commercial software, we build Windows applications and take them all the way to release.",
    ],
    items: [
      { title: "Built on .NET and WinUI", body: "Modern, native Windows applications." },
      { title: "Delivered properly", body: "A signed installer or a Microsoft Store listing." },
      { title: "One backend for every platform", body: "Shares the same API and database as your web and mobile apps." },
      { title: "Quoted individually", body: "Windows projects are priced to their scope: ask us for a quote." },
    ],
    cta: { label: "Request a quote", path: "/quote" },
  },
  {
    id: "quality",
    subject: "How we check our work before it ships",
    eyebrow: "Quality",
    heading: "Built to a standard, and checked.",
    paragraphs: ["Good software is the result of habits you can see. These are ours."],
    items: [
      {
        title: "Tested on real devices and networks",
        body: "We test on real devices and real networks, including slow connections and older hardware, before release.",
        source: "Published on the site: Process step 4 (\"Real devices, real networks...\") and Services > Testing & QA.",
      },
      {
        title: "A working build every week",
        body: "You see a working build every week, so progress is visible as it happens.",
        source: "Published on the site: Process step 3 (\"You see a working build every week\").",
      },
      {
        title: "A written Project Agreement",
        body: "Scope, deliverables, timeline and fees are set out in a written agreement that both sides sign.",
        source: "Terms of Service sections 2 and 3.",
      },
      {
        title: "Defects in our work are corrected",
        body: "We correct defects in our work that are reported within 30 days of final delivery at no additional charge, as set out in our Terms of Service.",
        source: "Terms of Service section 8 (Warranties).",
      },
    ],
    cta: { label: "Read how a project works", path: "/web-app-landing" },
  },
  {
    id: "backend",
    subject: "One backend behind every platform",
    eyebrow: "APIs and backends",
    heading: "The quiet part that holds everything up.",
    paragraphs: [
      "A clean backend is what lets a web app, a phone app and a Windows program share the same data without duplicating work.",
    ],
    items: [
      { title: "Accounts and logic", body: "Authentication, business rules and queues, built with tools such as Node.js, Supabase and Docker." },
      { title: "Databases set up and looked after", body: "Setup, tuning, backups and migrations, on PostgreSQL, MongoDB and SQLite." },
      { title: "Connected to what you use", body: "Integrations with the third-party services your product needs." },
    ],
    cta: { label: "See backend services", path: "/pricing" },
  },
  {
    id: "process",
    subject: "From first call to launch: how a project runs",
    eyebrow: "How a project runs",
    heading: "From first conversation to launch.",
    paragraphs: ["Here is how a project with us works, in four steps."],
    items: [
      { title: "Discuss your requirements", body: "Your goals, your users and your limits." },
      { title: "Agree scope and price", body: "Written down before any code exists." },
      { title: "Design and development", body: "A clickable prototype first, then working builds every week." },
      { title: "Launch and support", body: "We release it, then stay on to keep it fast and current." },
    ],
    cta: { label: "Start with a quote request", path: "/quote" },
  },
  {
    id: "ecommerce",
    subject: "Online stores that are ready for real payments",
    eyebrow: "E-commerce",
    heading: "Stores that are ready for real payments.",
    paragraphs: [
      "A store is a catalogue, a cart, a checkout and a way to handle orders. We build all four and connect them to a payment provider.",
    ],
    items: [
      { title: "Built for checkout", body: "Using tools such as Next.js, TypeScript, PostgreSQL and Stripe." },
      { title: "Hosted payment pages", body: "Customers pay on the payment provider's own page." },
      { title: "Orders and inventory", body: "Order handling and inventory management to run the store." },
    ],
    cta: { label: "See store pricing", path: "/pricing" },
  },
  {
    id: "support",
    subject: "After launch: keeping your software healthy",
    eyebrow: "After launch",
    heading: "Support does not end at launch.",
    paragraphs: ["Software needs looking after. We offer maintenance and support so it stays secure and current."],
    items: [
      { title: "Fixes and compatibility", body: "Bug fixes, and updates when phones and operating systems change." },
      { title: "Room to grow", body: "Feature enhancements as your needs change." },
      { title: "Watched for you", body: "Performance monitoring, so slow spots are found before your customers find them." },
    ],
    cta: { label: "Ask about support", path: "/quote" },
  },
];

export const topicFor = (sequence) => TOPICS[(Math.max(1, sequence) - 1) % TOPICS.length];
