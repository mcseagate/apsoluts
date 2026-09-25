# Apex Root Solutions LLC — Business Website

Professional business website for Apex Root Solutions LLC, a software and technology company specializing in mobile application development.

## Pages & Sections

- **Navbar** — Sticky glassmorphism navigation with mobile menu, phone number, and CTA
- **Hero** — Full-viewport hero with headline, subtext, and two CTAs
- **About** — Company overview with animated stats (projects, satisfaction, support, experience)
- **Services** — 6 service cards: App Development, UI/UX Design, Consultation, Testing & QA, Maintenance, Launch Strategy
- **Why Choose Us** — 5 feature highlights with descriptions
- **Testimonials** — 3 placeholder client testimonial cards
- **FAQ** — 5 collapsible Q&A items using Accordion
- **Contact** — Contact info card + validated contact form (posts to /api/contact)
- **Newsletter** — Email signup placeholder
- **Footer** — Company info, quick links, contact details, social icons, legal links
- **WhatsApp Button** — Floating green button opens WhatsApp chat with pre-filled message

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, Framer Motion, React Hook Form, Zod
- **Backend:** Bun, Hono, Zod validation
- **Fonts:** DM Sans (body), Plus Jakarta Sans (headings)
- **Colors:** Corporate blue primary, amber/gold accent, clean white background

## Product documents (proxied, not built here)

The privacy policy, terms and support page for each app — `/folio/privacy/`,
`/clearbook/terms/` and so on — are **not** part of this site. They live in the
`ApexRootsolutions` repository and are published by GitHub Actions to GitHub
Pages. `vercel.json` proxies those paths to that site so they answer on this
domain, which is what the apps and the app-store listings point at.

Two things follow from that, and both are easy to trip over:

- The rules sit **above** the SPA catch-all in `vercel.json`. The first matching
  rewrite wins, and `/(.*)` matches everything, so anything added below it never
  runs. Keep it last.
- A document URL without its trailing slash is redirected here before the proxy
  runs. Left to GitHub Pages, its own redirect would send the reader to
  `mcseagate.github.io` and show the real host.

`/style.css` is proxied too, because those pages link their stylesheet
relatively and it resolves to the site root. Vercel serves a real file in
preference to a rewrite, so this cannot shadow an asset this site builds.

To change a policy, edit it in the `ApexRootsolutions` repository — the change
is live here as soon as that site publishes, with no deployment of this one.

## API Endpoints

- `POST /api/contact` — Contact form submission (fullName, email, phone?, message)

## Contact Details

- **Phone:** 310-849-6035
- **Email:** contact@apsoluts.com
- **Address:** 1732 Orlando Dr, Cedar Hill, TX 75104
