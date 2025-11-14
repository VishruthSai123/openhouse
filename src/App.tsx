import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";
import IdeasHub from "./pages/IdeasHub";
import CreateIdea from "./pages/CreateIdea";
import IdeaDetail from "./pages/IdeaDetail";
import FindTeam from "./pages/FindTeam";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/home" element={<Home />} />
            <Route path="/ideas" element={<IdeasHub />} />
            <Route path="/ideas/new" element={<CreateIdea />} />
            <Route path="/ideas/:id" element={<IdeaDetail />} />
            <Route path="/find-team" element={<FindTeam />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
