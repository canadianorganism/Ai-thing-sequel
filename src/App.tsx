import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import AdaptiveAIDownload from "./pages/AdaptiveAIDownload.tsx";
import AdaptiveAICheckout from "./pages/AdaptiveAICheckout.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import CheckoutReturn from "./pages/CheckoutReturn.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PaymentTestModeBanner />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
          <Route path="/adaptive-ai" element={<RequireAuth><AdaptiveAIDownload /></RequireAuth>} />
          <Route path="/adaptive-ai/checkout" element={<RequireAuth><AdaptiveAICheckout /></RequireAuth>} />
          <Route path="/adaptive-ai/checkout/return" element={<RequireAuth><CheckoutReturn /></RequireAuth>} />
          <Route path="*" element={<RequireAuth><NotFound /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
