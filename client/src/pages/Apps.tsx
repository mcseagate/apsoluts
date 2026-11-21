import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Apple, Smartphone } from "lucide-react";
import { apps, appStoreUrl, playStoreUrl, type AppListing } from "@/data/apps";
import ShaderField from "@/components/fx/ShaderField";
import Spotlight from "@/components/fx/Spotlight";

type Platform = "ios" | "android" | "other";

// iPadOS 13+ reports itself as a Mac, so it is told apart by touch support.
function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return "ios";
  return "other";
}

interface StoreButtonProps {
  store: "ios" | "android";
  href?: string;
  appName: string;
  primary: boolean;
}

// A live store gets a link, which on a phone hands off to the App Store or
// Play Store app at the install screen. A store the app is not on gets a note.
const StoreButton = ({ store, href, appName, primary }: StoreButtonProps) => {
  const Icon = store === "ios" ? Apple : Smartphone;
  const label = store === "ios" ? "App Store" : "Google Play";

  // Same shape and size as a live button, but grayed out and not clickable.
  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={`${appName} is not yet available on ${label}`}
        className="flex cursor-not-allowed select-none items-center justify-center gap-2 border border-dashed border-border bg-muted/40 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/45"
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span className="whitespace-nowrap">{store === "ios" ? "Not on the App Store" : "Not on Google Play"}</span>
      </span>
    );
  }

  return (
    <a
      href={href}
      rel="noopener"
      aria-label={`Get ${appName} on ${label}`}
      className={
        primary
          ? "flex items-center justify-center gap-2 bg-foreground text-background px-4 py-3 text-[11px] tracking-[0.18em] uppercase font-medium hover:bg-foreground/85 transition-colors"
          : "flex items-center justify-center gap-2 border border-foreground/40 text-foreground px-4 py-3 text-[11px] tracking-[0.18em] uppercase hover:bg-foreground hover:text-background transition-colors"
      }
    >
      <Icon className="h-4 w-4" aria-hidden />
      {store === "ios" ? "Get it on the App Store" : "Get it on Google Play"}
    </a>
  );
};

const AppCard = ({ app, platform }: { app: AppListing; platform: Platform }) => {
  const ios = app.appStoreId ? appStoreUrl(app.appStoreId) : undefined;
  const android = app.playPackage ? playStoreUrl(app.playPackage) : undefined;

  // Both stores are always listed. The visitor's own store comes first and is
  // the filled button; on desktop the App Store leads.
  const androidFirst = platform === "android";
  const iosPrimary = platform !== "android";
  const androidPrimary = platform === "android";

  return (
    <Spotlight as="article" tilt className="flex flex-col border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <img
          src={`/apps/${app.slug}.jpg`}
          alt={`${app.name} icon`}
          width={72}
          height={72}
          loading="lazy"
          className="h-[72px] w-[72px] rounded-[18px] border border-border object-cover"
        />
        <div className="min-w-0">
          <h2 className="font-display text-2xl tracking-wide text-foreground leading-tight">{app.name}</h2>
          <p className="mt-1 text-[10px] tracking-[0.25em] uppercase text-muted-foreground">{app.category}</p>
        </div>
      </div>

      <p className="mt-5 mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">{app.description}</p>

      <div className={`flex gap-3 ${androidFirst ? "flex-col-reverse" : "flex-col"}`}>
        <StoreButton store="ios" href={ios} appName={app.name} primary={iosPrimary} />
        <StoreButton store="android" href={android} appName={app.name} primary={androidPrimary} />
      </div>
    </Spotlight>
  );
};

const Apps = () => {
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    setPlatform(detectPlatform());
    const previous = document.title;
    document.title = "Our Apps | Apex Root Solutions";
    return () => {
      document.title = previous;
    };
  }, []);

  const intro =
    platform === "ios"
      ? "Tap an app's App Store button to install it. Google Play is listed too."
      : platform === "android"
        ? "Tap an app's Google Play button to install it. The App Store is listed too."
        : "Open this page on your phone to go straight to your store, or pick one below.";

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* the same live red field as the home page, fading into the cards */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[620px]">
        <ShaderField intensity={0.85} className="h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
      </div>

      <div className="relative z-10 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-xl tracking-[0.2em] text-foreground hover:text-muted-foreground transition-colors"
          >
            APEX ROOT
          </Link>
          <Link
            to="/"
            className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <div className="mb-14">
          <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-4">Apps</p>
          <h1 className="font-display text-6xl md:text-8xl leading-none tracking-wide text-foreground mb-6">
            OUR
            <br />
            <span className="text-outline">APPS</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">{intro}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <AppCard key={app.slug} app={app} platform={platform} />
          ))}

          {/* Completes the grid: with eight apps this fills the last slot on
              three columns and the whole last row on two. */}
          <Link
            to="/#contact"
            className="group flex flex-col justify-between gap-10 bg-accent p-6 text-accent-foreground transition-colors hover:bg-accent/90 md:col-span-2 lg:col-span-1"
          >
            <span className="font-display text-4xl leading-none tracking-wide md:text-5xl">
              HAVE AN APP
              <br />
              IN MIND?
            </span>
            <span className="flex items-center justify-between gap-6 text-sm">
              We build for iPhone, Android, the web and Windows.
              <span aria-hidden className="text-2xl transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </Link>
        </div>

        <p className="mt-14 text-xs text-muted-foreground">
          Apple and the App Store are trademarks of Apple Inc. Google Play is a trademark of Google LLC.
        </p>
      </main>
    </div>
  );
};

export default Apps;
