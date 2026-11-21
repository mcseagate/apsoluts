// Prices shown on /pricing. Amounts are whole US dollars except the hourly
// rate, which has cents. Change a number here and the ladder, the estimator
// and the headline figures all follow.

export type ServiceGroup = "Websites" | "Software" | "Real-time & play" | "Mobile";

export interface Service {
  id: string;
  group: ServiceGroup;
  name: string;
  blurb: string;
  /** Low and high end of the range, in dollars (per hour when `unit` is "hour"). */
  min: number;
  max: number;
  unit: "project" | "hour";
  /** Technologies this kind of work is usually built with. */
  tech: string[];
}

export const services: Service[] = [
  {
    id: "single-page",
    group: "Websites",
    name: "Single-page website",
    blurb: "One focused page that says who you are and gets the visitor to act.",
    min: 150,
    max: 500,
    unit: "project",
    tech: ["React", "Vite", "Tailwind CSS", "Vercel"],
  },
  {
    id: "multi-page",
    group: "Websites",
    name: "Multi-page business website",
    blurb: "A full site with services, about, contact forms, blog or newsletter and a proper admin.",
    min: 500,
    max: 5600,
    unit: "project",
    tech: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Resend"],
  },
  {
    id: "ecommerce",
    group: "Websites",
    name: "E-commerce store",
    blurb: "Catalogue, cart, checkout and order handling, ready to take real payments.",
    min: 1500,
    max: 10500,
    unit: "project",
    tech: ["Next.js", "TypeScript", "PostgreSQL", "Stripe", "Vercel"],
  },
  {
    id: "web-app",
    group: "Software",
    name: "Custom web application",
    blurb: "Dashboards, portals, internal tools and SaaS products built around how you work.",
    min: 1000,
    max: 35000,
    unit: "project",
    tech: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"],
  },
  {
    id: "integration",
    group: "Software",
    name: "Database setup or API integration",
    blurb: "Stand up a database, or connect your product to the services it needs to talk to.",
    min: 350,
    max: 1050,
    unit: "project",
    tech: ["PostgreSQL", "MongoDB", "REST", "Webhooks"],
  },
  {
    id: "backend",
    group: "Software",
    name: "Application backend",
    blurb: "Authentication, business logic, queues and an API your apps can rely on.",
    min: 2100,
    max: 5600,
    unit: "project",
    tech: ["Node.js", "Hono", "PostgreSQL", "Supabase", "Docker"],
  },
  {
    id: "dba",
    group: "Software",
    name: "Database administration",
    blurb: "Tuning, backups, migrations and health checks, billed by the hour.",
    min: 24.5,
    max: 52.5,
    unit: "hour",
    tech: ["PostgreSQL", "MongoDB", "SQLite", "Typesense"],
  },
  {
    id: "realtime",
    group: "Real-time & play",
    name: "Video streaming and real-time features",
    blurb: "Live calls, streaming, chat and anything that has to update the instant it happens.",
    min: 2000,
    max: 5000,
    unit: "project",
    tech: ["WebRTC", "WebSockets", "FFmpeg", "TURN relay"],
  },
  {
    id: "game",
    group: "Real-time & play",
    name: "Playable game prototype",
    blurb: "Something you can hold and play, to test the idea before you fund the full game.",
    min: 420,
    max: 2450,
    unit: "project",
    tech: ["Kotlin", "SwiftUI", "Canvas / WebGL"],
  },
  {
    id: "mobile",
    group: "Mobile",
    name: "Mobile app development (iOS and Android)",
    blurb: "Native, Flutter or Expo: one app or both stores, shipped through App Store and Google Play.",
    min: 500,
    max: 20000,
    unit: "project",
    tech: ["SwiftUI", "Kotlin", "Jetpack Compose", "Flutter", "Expo", "React Native"],
  },
];

export const groups: ServiceGroup[] = ["Websites", "Software", "Real-time & play", "Mobile"];

export interface TechGroup {
  title: string;
  note: string;
  items: string[];
}

// The tools the studio actually builds with, grouped by the layer they sit in.
export const techGroups: TechGroup[] = [
  {
    title: "Mobile & desktop",
    note: "Native when it matters, cross-platform when it counts, and Windows for the desktop.",
    items: ["SwiftUI", "Kotlin", "Jetpack Compose", "Flutter", "Expo", "React Native", ".NET", "WinUI"],
  },
  {
    title: "Web front end",
    note: "Fast, accessible, installable.",
    items: ["React", "Next.js", "Vite", "TypeScript", "Tailwind CSS", "Framer Motion"],
  },
  {
    title: "Back end",
    note: "APIs that stay up and stay simple.",
    items: ["Node.js", "Hono", "REST", "Webhooks", "Docker"],
  },
  {
    title: "Data",
    note: "Pick the store that fits the shape of the data.",
    items: ["PostgreSQL", "MongoDB", "SQLite", "Supabase", "Typesense"],
  },
  {
    title: "Real-time & media",
    note: "Calls, streams and video you can trust.",
    items: ["WebRTC", "WebSockets", "FFmpeg", "TURN relay", "Whisper"],
  },
  {
    title: "Payments & mail",
    note: "Get paid and stay in touch.",
    items: ["Stripe", "RevenueCat", "StoreKit", "Play Billing", "Resend"],
  },
  {
    title: "AI",
    note: "Used where it helps, never as decoration.",
    items: ["Claude API", "Whisper"],
  },
  {
    title: "Ship & run",
    note: "From first commit to production.",
    items: ["Vercel", "Render", "Fly.io", "Cloudflare", "GitHub Actions", "App Store Connect", "Google Play Console", "Microsoft Store"],
  },
];

export const allTech: string[] = Array.from(new Set(techGroups.flatMap((g) => g.items)));

// What nudges a quote toward one end of a range or the other.
export const lowerEnd = [
  "One platform, or just the web",
  "A handful of screens",
  "Your brand and copy are ready",
  "Standard, off-the-shelf integrations",
  "Flexible timeline",
];

export const upperEnd = [
  "iOS and Android, native or both",
  "Custom design, motion and illustration",
  "Accounts, roles and permissions",
  "Payments, subscriptions or live video",
  "Data migration and third-party systems",
];

export const money = (n: number): string =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
