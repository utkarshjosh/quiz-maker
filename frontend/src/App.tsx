import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import QuizPage from "./pages/QuizPage";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import PlayLanding from "./pages/play/Landing";
import JoinWithPin from "./pages/play/JoinWithPin";
import PublicCategory from "./pages/play/PublicCategory";
import Matchmaking from "./pages/play/Matchmaking";
import WaitingRoom from "./pages/play/WaitingRoom";
import HostStart from "./pages/play/HostStart";
import QuizPlay from "./pages/play/Quiz";
import LeaderboardFinal from "./pages/play/LeaderboardFinal";
import ImmersiveCanvas from "./pages/immersive";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
        <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<QuizPage />} />
            <Route path="/user/profile" element={<Profile />} />
            {/* Play flow routes */}
            <Route path="/play" element={<PlayLanding />} />
            <Route path="/play/join" element={<JoinWithPin />} />
            <Route path="/play/public" element={<PublicCategory />} />
            <Route path="/play/match/:category" element={<Matchmaking />} />
            <Route path="/play/room/:roomId" element={<WaitingRoom />} />
            <Route path="/play/host/:quizId" element={<HostStart />} />
            <Route path="/play/quiz/:sessionId" element={<QuizPlay />} />
            <Route path="/play/leaderboard/:sessionId" element={<LeaderboardFinal />} />
            {/* Immersive demo flow (dummy data) */}
            <Route path="/immersive/*" element={<ImmersiveCanvas />} />
            <Route path=":category" element={<QuizPage />} />
            <Route path=":category/:subcategory" element={<QuizPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
