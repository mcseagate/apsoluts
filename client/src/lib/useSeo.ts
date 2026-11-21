import { useEffect } from "react";
import { SHARE_IMAGE, SITE_NAME, canonicalUrl, type PageSeo } from "@/data/seo";

// Sets the page's title, description, canonical link and social tags while it is
// mounted, and puts back what was there before when it unmounts. The static copy of
// these tags that crawlers read is written at build time from the same data.
export function useSeo(page: PageSeo) {
  useEffect(() => {
    const url = canonicalUrl(page);
    const previousTitle = document.title;
    document.title = page.title;

    const restore: (() => void)[] = [];
    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      const created = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      const before = el.getAttribute("content");
      el.setAttribute("content", content);
      restore.push(() => (created ? el!.remove() : el!.setAttribute("content", before ?? "")));
    };

    setMeta("name", "description", page.description);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", page.title);
    setMeta("property", "og:description", page.description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", SHARE_IMAGE);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", page.title);
    setMeta("name", "twitter:description", page.description);
    setMeta("name", "twitter:image", SHARE_IMAGE);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const linkCreated = !link;
    const linkBefore = link?.getAttribute("href") ?? "";
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;

    return () => {
      document.title = previousTitle;
      restore.forEach((fn) => fn());
      if (linkCreated) link!.remove();
      else link!.setAttribute("href", linkBefore);
    };
  }, [page]);
}
