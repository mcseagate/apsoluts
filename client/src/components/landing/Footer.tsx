import { Link } from "react-router-dom";
import LiveStatus from "@/components/fx/LiveStatus";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
} from "lucide-react";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Why Choose Us", href: "#why-choose-us" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const Footer = () => {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-background">
      <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-14 lg:gap-16 mb-16">
          {/* Brand */}
          <div>
            <p className="font-display text-xl md:text-2xl tracking-[0.2em] text-foreground mb-4">
              APEX ROOT
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Building modern, user-friendly mobile, web and Windows applications for businesses
              and entrepreneurs. Turning ideas into digital experiences.
            </p>
            <LiveStatus className="mt-6" />
            <div className="flex gap-3 mt-6">
              <a
                href="https://www.facebook.com/apexrootsolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 border border-border flex items-center justify-center hover:border-foreground/40 hover:text-foreground text-muted-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://www.instagram.com/apexrootsolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 border border-border flex items-center justify-center hover:border-foreground/40 hover:text-foreground text-muted-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-5">
              Navigation
            </p>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm tracking-wide"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              <li>
                <Link
                  to="/apps"
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm tracking-wide"
                >
                  Our Apps
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm tracking-wide"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-5">
              Contact
            </p>
            <div className="space-y-3">
              <a
                href="tel:3108496035"
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                (310) 849-6035
              </a>
              <a
                href="mailto:contact@apsoluts.com"
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                contact@apsoluts.com
              </a>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                1732 Orlando Dr, Cedar Hill, TX 75104
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs tracking-wide">
            © 2026 Apex Root Solutions LLC. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy-policy"
              className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-wide"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
              className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-wide"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
