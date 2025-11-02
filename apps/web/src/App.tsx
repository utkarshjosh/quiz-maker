import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import QuizPage from "./pages/QuizPage";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import JoinWithPin from "./pages/play/JoinWithPin";
import ImmersiveCanvas from "./pages/immersive";
import ProtectedRoute from "./auth/ProtectedRoute";
import WebSocketTest from "./components/WebSocketTest";
// OLD WebSocket system removed - now using game/hooks/useGameManager
// import { AuthenticatedWebSocketProvider } from "./contexts/AuthenticatedWebSocketProvider";

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

            {/* Immersive Quiz Experience - NEW game system handles WebSocket */}
            <Route
              path="/play/*"
              element={
                <ProtectedRoute>
                  {/* No WebSocketProvider needed - useGameManager() handles it */}
                  <Routes>
                    <Route index element={<ImmersiveCanvas />} />
                    <Route path="join" element={<JoinWithPin />} />
                    <Route path="public" element={<ImmersiveCanvas />} />
                    <Route path="match/:category" element={<ImmersiveCanvas />} />
                    <Route path="room/:roomId" element={<ImmersiveCanvas />} />
                    <Route path="host/:quizId" element={<ImmersiveCanvas />} />
                    <Route path="quiz/:sessionId" element={<ImmersiveCanvas />} />
                    <Route path="leaderboard/:sessionId" element={<ImmersiveCanvas />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            {/* Immersive demo (public or change to ProtectedRoute if needed) */}
            <Route path="/immersive/*" element={<ImmersiveCanvas />} />

            {/* WebSocket Test Page - keeping old system for testing */}
            <Route path="/ws-test" element={<WebSocketTest />} />

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
