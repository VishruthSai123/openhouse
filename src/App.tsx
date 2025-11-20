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
import PostDetailRouter from "./pages/PostDetail.router";
import JobDetail from "./pages/JobDetail";
import DiscussionDetail from "./pages/DiscussionDetail";
import FindTeam from "./pages/FindTeam";
import Projects from "./pages/Projects";
import CreateProject from "./pages/CreateProject";
import ProjectDetail from "./pages/ProjectDetail";
import Leaderboard from "./pages/Leaderboard";
import Mentorship from "./pages/Mentorship";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import PostDetail from "./pages/PostDetail";
import Connections from "./pages/Connections";
import Profile from "./pages/Profile";
import IdeaValidator from "./pages/IdeaValidator";
import IdeaValidatorHistory from "./pages/IdeaValidatorHistory";
import Jobs from "./pages/Jobs";
import MobileBottomNav from "./components/MobileBottomNav";
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
            <Route path="/home" element={<Feed />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/feed/:postId" element={<PostDetail />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/ideas" element={<IdeasHub />} />
            <Route path="/ideas/new" element={<CreateIdea />} />
            <Route path="/ideas/:id" element={<IdeaDetail />} />
            <Route path="/post/:id" element={<PostDetailRouter />} />
            <Route path="/post/:id/edit" element={<CreateIdea />} />
            <Route path="/idea-validator" element={<IdeaValidator />} />
            <Route path="/idea-validator-history" element={<IdeaValidatorHistory />} />
            <Route path="/find-team" element={<FindTeam />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<CreateProject />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/mentorship" element={<Mentorship />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileBottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
