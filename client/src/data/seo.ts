// Per-page search and social metadata. One source for two consumers:
//   - the page itself (lib/useSeo.ts) sets it in the browser, and
//   - the build (vite.config.ts) writes it into a copy of index.html for the route,
//     because Facebook's link preview and most other crawlers read the raw HTML and
//     do not run JavaScript, so the single-page app's own tags would be all they see.

export const SITE_ORIGIN = "https://www.apsoluts.com";
export const SITE_NAME = "Apex Root Solutions LLC";
export const SHARE_IMAGE = `${SITE_ORIGIN}/og-base.png`;

export interface PageSeo {
  /** Route path, no trailing slash. */
  path: string;
  title: string;
  description: string;
}

export const appDevelopmentSeo: PageSeo = {
  path: "/app-development",
  title: "Web, Mobile & Windows App Development | Apex Root Solutions",
  description:
    "Custom web, iOS, Android and Windows apps built around how your business works. Agree scope and a price range before any code is written.",
};

// Pages that get their own pre-rendered head at build time.
export const seoPages: PageSeo[] = [appDevelopmentSeo];

export const canonicalUrl = (page: PageSeo) => `${SITE_ORIGIN}${page.path}`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// The tags a page needs in <head>. Used by the build; the browser path sets the
// same values one by one.
export function headTags(page: PageSeo): string {
  const url = canonicalUrl(page);
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SHARE_IMAGE}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${SHARE_IMAGE}" />`,
  ].join("\n  ");
}
