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
import WebSocketTest from "./components/WebSocketTest";
import { AuthenticatedWebSocketProvider } from "./contexts/AuthenticatedWebSocketProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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

            {/* Protected: user profile */}
            <Route
              path="/user/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Immersive Quiz Experience with WebSocket - Only for /play routes */}
            <Route
              path="/play"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <ImmersiveCanvas />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/join"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <ImmersiveCanvas />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/public"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <ImmersiveCanvas />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/match/:category"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <ImmersiveCanvas />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/room/:roomId"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <ImmersiveCanvas />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/host/:quizId"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <ImmersiveCanvas />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/quiz/:sessionId"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <ImmersiveCanvas />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/leaderboard/:sessionId"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <ImmersiveCanvas />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />

            {/* Immersive demo (public or change to ProtectedRoute if needed) */}
            <Route path="/immersive/*" element={<ImmersiveCanvas />} />

            {/* Auth Test Page for development */}
            <Route path="/auth-test" element={<AuthTestPage />} />

            {/* WebSocket Test Page for development */}
            <Route
              path="/ws-test"
              element={
                <ProtectedRoute>
                  <AuthenticatedWebSocketProvider>
                    <WebSocketTest />
                  </AuthenticatedWebSocketProvider>
                </ProtectedRoute>
              }
            />

            {/* 404 Page */}
            <Route path="/404" element={<NotFound />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
