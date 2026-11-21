import { useState, useEffect } from "react";
import { Menu, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { openPalette } from "@/components/fx/CommandPalette";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why-choose-us" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check if admin is logged in on mount
  useEffect(() => {
    // Only decides whether to show the admin link; the server checks the token.
    setIsAdmin(Boolean(localStorage.getItem("apsoluts_admin_token")));
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-background/90 backdrop-blur-md border-b border-accent/30 shadow-[0_1px_30px_-10px_hsl(var(--accent)/0.5)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <button
              onClick={() => scrollTo("#home")}
              className="flex shrink-0 items-center gap-3 whitespace-nowrap font-display text-xl tracking-[0.2em] text-foreground"
            >
              <img src="/apex-logo.png" alt="Apex Root Logo" className="h-9 w-9 object-contain" />
              APEX ROOT
            </button>

            <div className="hidden lg:flex items-center gap-6 xl:gap-10">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="nav-link whitespace-nowrap text-[11px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  {link.label}
                </button>
              ))}
              <Link
                to="/apps"
                className="nav-link whitespace-nowrap text-[11px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                Apps
              </Link>
              <Link
                to="/pricing"
                className="nav-link whitespace-nowrap text-[11px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                Pricing
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <button
                type="button"
                onClick={openPalette}
                aria-label="Open command palette"
                className="hidden items-center gap-2 border border-border px-2.5 py-1.5 xl:flex text-[10px] tracking-[0.15em] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
              >
                <Search className="h-3 w-3" aria-hidden />
                <span>⌘K</span>
              </button>
              <a
                href="tel:3108496035"
                className="hidden whitespace-nowrap text-[11px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors xl:block"
              >
                310-849-6035
              </a>
              {isAdmin ? (
                <Link
                  to="/admin/subscribers"
                  className="text-[11px] tracking-[0.15em] uppercase border border-accent text-accent px-5 py-2.5 hover:bg-accent hover:text-accent-foreground transition-all duration-300 font-medium"
                >
                  Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => scrollTo("#contact")}
                  className="text-[11px] tracking-[0.15em] uppercase border border-foreground/40 text-foreground px-5 py-2.5 hover:bg-foreground hover:text-background transition-all duration-300"
                >
                  Get Started
                </button>
              )}
            </div>

            <button
              className="lg:hidden text-foreground p-1.5"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      <div
        className={`fixed inset-0 z-40 bg-background transition-all duration-500 flex flex-col items-center justify-center ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center gap-10">
          {navLinks.map((link, i) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="font-display text-3xl sm:text-4xl tracking-[0.15em] text-foreground hover:text-muted-foreground transition-colors"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {link.label.toUpperCase()}
            </button>
          ))}
          <Link
            to="/apps"
            onClick={() => setMobileOpen(false)}
            className="font-display text-3xl sm:text-4xl tracking-[0.15em] text-foreground hover:text-muted-foreground transition-colors"
          >
            APPS
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileOpen(false)}
            className="font-display text-3xl sm:text-4xl tracking-[0.15em] text-foreground hover:text-muted-foreground transition-colors"
          >
            PRICING
          </Link>
          <div className="mt-6 flex flex-col items-center gap-5">
            <a
              href="tel:3108496035"
              className="text-sm tracking-widest text-muted-foreground"
            >
              (310) 849-6035
            </a>
            {isAdmin ? (
              <Link
                to="/admin/subscribers"
                className="text-[11px] tracking-[0.2em] uppercase border border-accent text-accent px-6 py-3 hover:bg-accent hover:text-accent-foreground transition-all font-medium text-center"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <button
                onClick={() => scrollTo("#contact")}
                className="text-[11px] tracking-[0.2em] uppercase border border-foreground text-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-all"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
