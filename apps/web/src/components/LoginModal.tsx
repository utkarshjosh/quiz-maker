import { useAuth } from "@/auth/AuthContext";
import { createPortal } from "react-dom";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

const LoginModal = ({
  isOpen,
  onClose,
  title = "Sign in to continue",
  description = "Access your account to use this feature",
}: LoginModalProps) => {
  const { login, isLoading } = useAuth();

  const handleLogin = () => {
    login({ returnTo: window.location.pathname });
    onClose(); // Close modal immediately as we're redirecting
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}>
      {/* Background pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: "rgba(141, 82, 224, 0.11)",
        }}
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className="relative bg-base-100 rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform scale-110"
        onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-base-200 hover:bg-base-300 flex items-center justify-center text-base-content/60 hover:text-base-content transition-colors z-10"
          onClick={onClose}>
          ✕
        </button>

        {/* Content */}
        <div className="p-8 pt-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-base-content mb-3">
              {title}
            </h3>
            <p className="text-base-content/70 text-lg leading-relaxed">
              {description}
            </p>
          </div>

          <div className="space-y-4">
            <button
              className={`w-full h-14 px-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-content font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 ${
                isLoading ? "opacity-70" : ""
              }`}
              onClick={handleLogin}
              disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Sign In with Auth0
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-sm text-base-content/60 leading-relaxed">
                You'll be securely redirected to Auth0 for authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render in a portal to ensure global positioning
  return createPortal(modalContent, document.body);
};

export default LoginModal;
