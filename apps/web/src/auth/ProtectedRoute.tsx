import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import LoginModal from "@/components/LoginModal";

interface ProtectedRouteProps {
  children: JSX.Element;
  title?: string;
  description?: string;
}

const ProtectedRoute = ({
  children,
  title = "Sign in to continue",
  description = "This page requires authentication. Please sign in to continue.",
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Show login modal when not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title={title}
        description={description}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
