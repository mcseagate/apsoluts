import { allTech } from "@/data/pricing";

// A red band of scrolling technology names that joins the hero to the page.

const TechBand = () => (
  <div className="relative overflow-hidden border-y border-accent bg-accent py-4" aria-label="Technologies we build with">
    <div className="group flex w-max animate-marquee motion-reduce:animate-none [animation-duration:55s] hover:[animation-play-state:paused]">
      {[0, 1].map((copy) => (
        <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
          {allTech.map((t) => (
            <li key={t} className="flex items-center">
              <span className="whitespace-nowrap px-6 font-display text-2xl tracking-[0.12em] text-accent-foreground md:text-3xl">
                {t.toUpperCase()}
              </span>
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-background" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  </div>
);

export default TechBand;
