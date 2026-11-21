import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Subscribers from "./pages/Subscribers";
import Apps from "./pages/Apps";
import Pricing from "./pages/Pricing";
import Quote from "./pages/Quote";
import Invoice from "./pages/Invoice";
import AdminBilling from "./pages/AdminBilling";
import SiteEffects from "./components/fx/SiteEffects";
import CommandPalette from "./components/fx/CommandPalette";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SiteEffects />
        <CommandPalette />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/admin/subscribers" element={<Subscribers />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
