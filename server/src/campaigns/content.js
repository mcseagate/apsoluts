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
//   * Security and quality statements are written as specific practices, never as
//     guarantees. No certifications or named standards are claimed, and nothing says
//     a product "cannot be hacked" or is "uncompromised": nobody can honestly promise
//     that. CLAIMS TO CONFIRM marks the statements the owner must be able to stand
//     behind for the work they sell; edit or remove any that are not true for you.

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
      "No one can promise software will never be attacked. So we focus on the habits that prevent the common failures, and that limit the damage when something goes wrong.",
    ],
    // CLAIMS TO CONFIRM: each item must be true of the work you deliver.
    items: [
      { title: "Secrets stay on the server", body: "Keys and credentials never sit inside the app or website code." },
      { title: "Input is checked on the server", body: "Validation does not rely on the browser alone." },
      { title: "Payments stay with the provider", body: "Hosted checkout, such as Stripe, means card details never touch your own servers." },
      { title: "Confirmations are verified", body: "Payments are confirmed from the provider's signed events, not trusted from a browser redirect." },
      { title: "Access is checked every time", body: "Administration screens are protected on the server with every request." },
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
    // CLAIMS TO CONFIRM
    items: [
      { title: "Tested on real devices and networks", body: "Including slow connections and older hardware, before every release." },
      { title: "A working build every week", body: "So you see progress as it happens." },
      { title: "A written Project Agreement", body: "Scope, deliverables, timeline and fees, set down before work begins." },
      { title: "Defects corrected", body: "Defects in our work reported within 30 days of final delivery are fixed at no extra charge." },
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
      { title: "Databases you can rely on", body: "Setup, tuning, backups and migrations, on PostgreSQL and similar." },
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
      { title: "Hosted payment pages", body: "Customers pay on the provider's secure page." },
      { title: "Run it your way", body: "Order handling and an admin screen to manage the store." },
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
