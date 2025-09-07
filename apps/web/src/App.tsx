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
import ProtectedRoute from "./auth/ProtectedRoute";
import AuthTestPage from "./components/AuthTestPage";
import { WebSocketProvider } from "./contexts/WebSocketContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* Public browsing */}
              <Route path="/" element={<QuizPage />} />
              <Route path=":category" element={<QuizPage />} />
              <Route path=":category/:subcategory" element={<QuizPage />} />

              {/* Protected: user profile and play flow */}
              <Route
                path="/user/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Immersive Quiz Experience - Replaces existing play routes */}
              <Route
                path="/play"
                element={
                  <ProtectedRoute>
                    <ImmersiveCanvas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play/join"
                element={
                  <ProtectedRoute>
                    <ImmersiveCanvas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play/public"
                element={
                  <ProtectedRoute>
                    <ImmersiveCanvas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play/match/:category"
                element={
                  <ProtectedRoute>
                    <ImmersiveCanvas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play/room/:roomId"
                element={
                  <ProtectedRoute>
                    <ImmersiveCanvas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play/host/:quizId"
                element={
                  <ProtectedRoute>
                    <ImmersiveCanvas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play/quiz/:sessionId"
                element={
                  <ProtectedRoute>
                    <ImmersiveCanvas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/play/leaderboard/:sessionId"
                element={
                  <ProtectedRoute>
                    <ImmersiveCanvas />
                  </ProtectedRoute>
                }
              />

              {/* Immersive demo (public or change to ProtectedRoute if needed) */}
              <Route path="/immersive/*" element={<ImmersiveCanvas />} />

              {/* Auth Test Page for development */}
              <Route path="/auth-test" element={<AuthTestPage />} />

              {/* 404 Page */}
              <Route path="/404" element={<NotFound />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WebSocketProvider>
  </QueryClientProvider>
);

export default App;
