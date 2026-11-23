// The apps listed on /apps. Add a store field only when the app is live there:
// the page shows a grayed-out "not yet available" button for a store that is
// left out.
//
// Checked 2026-11-21 against Apple's lookup API (every App Store id below
// resolves, and the developer has no other iOS apps in the listing) and the
// Apsoluts developer page on Google Play (every package below is listed).
// Not found, so left grayed out: FoodIntel and Bokskaper on the App Store (looked
// up by bundle ID in 35 storefronts), LinguaGo on Google Play (its candidate
// packages app.rork.linguago and com.apexrootsolutions.linguago both return 404).
// Berean Scroll reached the App Store on 2026-11-23 (id 6824113406, bundle
// com.bereanscroll.app, seller Apex Root Solutions LLC).
//
//   appStoreId   the number after "id" in the App Store URL
//   playPackage  the Android package name (the "id=" in the Play Store URL)

export interface AppListing {
  slug: string;
  name: string;
  category: string;
  description: string;
  appStoreId?: string;
  playPackage?: string;
}

// Storefront-free links: the store redirects each visitor to their own country.
export const appStoreUrl = (id: string) => `https://apps.apple.com/app/id${id}`;
export const playStoreUrl = (pkg: string) => `https://play.google.com/store/apps/details?id=${pkg}`;

export const apps: AppListing[] = [
  {
    slug: "nutreo-scan",
    name: "Nutreo Scan",
    category: "Health & Fitness",
    description: "Scan a barcode, snap a meal or search a food and get clear nutrition insights in seconds.",
    appStoreId: "6766230485",
    playPackage: "com.apexrootsolutions.nutreoscan",
  },
  {
    slug: "foodintel",
    name: "FoodIntel",
    category: "Health & Fitness",
    description: "Scan any packaged food's barcode for a 0-100 score tuned to your goals, diet and life stage.",
    // Android only for now; there is no App Store listing.
    playPackage: "com.rork.foodintel",
  },
  {
    slug: "screenshot-inbox",
    name: "Screenshot Inbox",
    category: "Productivity",
    description: "Reads the screenshots in your camera roll on your device and turns dates, receipts and codes into things to act on.",
    appStoreId: "6814667636",
    playPackage: "com.apexroot.screenshotinbox",
  },
  {
    slug: "linguago",
    name: "LinguaGo",
    category: "Utilities",
    description: "An AI translator for what you see, say and type, built to work without asking for your data.",
    appStoreId: "6805098088",
  },
  {
    slug: "biblical-insight",
    name: "Biblical Insight",
    category: "Books",
    description: "Scripture study tools for daily devotion, sermon preparation and teaching.",
    appStoreId: "6777496031",
    // Underscores, unlike the hyphenated iOS bundle ID.
    playPackage: "app.rork.biblical_insight_app",
  },
  {
    slug: "orb-pop",
    name: "Orb Pop",
    category: "Games",
    description: "A bubble-shooter with chain reactions, bank shots and combos across ever harder boards.",
    appStoreId: "6775609501",
    // The Play package is permanent and differs from the iOS bundle ID (com.orbpop.app).
    playPackage: "app.rork.orbpop",
  },
  {
    slug: "berean-scroll",
    name: "Berean Scroll",
    category: "Books",
    description: "Study the Bible word by word in Hebrew and Greek, with maps and a timeline, all available offline.",
    appStoreId: "6824113406",
    playPackage: "com.bereanscroll.app",
  },
  {
    slug: "bokskaper",
    name: "Bokskaper",
    category: "Productivity",
    description: "Turn a recording into a finished book: transcript, chapters, edits and a PDF.",
    playPackage: "com.apexrsol.bokskaper",
  },
];
