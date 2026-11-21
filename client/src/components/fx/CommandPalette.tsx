import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Command as CommandIcon,
  CornerDownLeft,
  FileText,
  Globe,
  HelpCircle,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Phone,
  Smartphone,
  Tag,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// Press Ctrl or Cmd + K (or "/") anywhere on the site to jump to a section,
// a page, or a way to reach the studio. Anything can also be reached by
// typing a few letters of its name.

export const OPEN_PALETTE_EVENT = "apex:open-palette";

const sections = [
  { label: "Home", hash: "#home", icon: Home, keywords: "top start" },
  { label: "About us", hash: "#about", icon: Users, keywords: "who we are team" },
  { label: "Services", hash: "#services", icon: Layers, keywords: "what we do build" },
  { label: "How we work", hash: "#process", icon: Globe, keywords: "process pipeline steps" },
  { label: "Why choose us", hash: "#why-choose-us", icon: Tag, keywords: "difference" },
  { label: "FAQ", hash: "#faq", icon: HelpCircle, keywords: "questions" },
  { label: "Contact form", hash: "#contact", icon: MessageSquare, keywords: "get started quote consultation" },
];

const pages = [
  { label: "Our apps", to: "/apps", icon: Smartphone, keywords: "app store google play download" },
  { label: "Pricing", to: "/pricing", icon: Tag, keywords: "cost estimate quote price" },
  { label: "Request a quote", to: "/quote", icon: MessageSquare, keywords: "custom project proposal estimate" },
  { label: "Privacy policy", to: "/privacy-policy", icon: FileText, keywords: "legal data" },
  { label: "Terms of service", to: "/terms-of-service", icon: FileText, keywords: "legal" },
];

export const openPalette = () => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable='true']");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  const go = useCallback(
    (action: () => void) => {
      setOpen(false);
      // let the dialog finish closing before moving the page underneath it
      window.setTimeout(action, 120);
    },
    [],
  );

  const toSection = (hash: string) =>
    go(() => {
      if (pathname === "/") document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      else navigate(`/${hash}`);
    });

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a section, a page, or a way to reach us…" />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>Nothing matches that. Try “pricing” or “contact”.</CommandEmpty>

        <CommandGroup heading="On this site">
          {sections.map(({ label, hash, icon: Icon, keywords }) => (
            <CommandItem key={hash} value={`${label} ${keywords}`} onSelect={() => toSection(hash)}>
              <Icon className="mr-3 h-4 w-4" aria-hidden />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Pages">
          {pages.map(({ label, to, icon: Icon, keywords }) => (
            <CommandItem key={to} value={`${label} ${keywords}`} onSelect={() => go(() => navigate(to))}>
              <Icon className="mr-3 h-4 w-4" aria-hidden />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Reach us">
          <CommandItem value="call phone 310-849-6035" onSelect={() => go(() => (window.location.href = "tel:3108496035"))}>
            <Phone className="mr-3 h-4 w-4" aria-hidden />
            Call 310-849-6035
          </CommandItem>
          <CommandItem
            value="email contact@apsoluts.com mail"
            onSelect={() => go(() => (window.location.href = "mailto:contact@apsoluts.com"))}
          >
            <Mail className="mr-3 h-4 w-4" aria-hidden />
            Email contact@apsoluts.com
          </CommandItem>
        </CommandGroup>
      </CommandList>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CornerDownLeft className="h-3 w-3" aria-hidden /> Select
        </span>
        <span className="flex items-center gap-1.5">
          <CommandIcon className="h-3 w-3" aria-hidden /> K to toggle
        </span>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;
