import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, Search, ArrowLeft, AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Main 404 Card */}
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body text-center space-y-6">
            {/* 404 Icon */}
            <div className="flex justify-center">
              <div className="avatar placeholder">
                <div className="bg-error text-error-content rounded-full w-24">
                  <AlertCircle className="w-12 h-12" />
                </div>
              </div>
            </div>

            {/* Error Number */}
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-error">404</h1>
              <h2 className="text-2xl font-semibold text-base-content">
                Page Not Found
              </h2>
              <p className="text-base-content/70">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            {/* Error Details */}
            <div className="alert alert-info">
              <Search className="w-5 h-5" />
              <div className="text-sm">
                <span className="font-medium">Requested URL:</span>
                <br />
                <code className="text-xs bg-base-200 px-2 py-1 rounded mt-1 inline-block">
                  {location.pathname}
                </code>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card-actions justify-center space-x-3">
              <Link to="/" className="btn btn-primary">
                <Home className="w-4 h-4" />
                Go Home
              </Link>
              <button
                onClick={() => window.history.back()}
                className="btn btn-outline">
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>

            {/* Help Text */}
            <div className="text-sm text-base-content/60">
              <p>
                If you believe this is an error, please{" "}
                <a
                  href="mailto:support@example.com"
                  className="link link-primary">
                  contact support
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-center mb-4 text-base-content">
            Popular Pages
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/" className="btn btn-sm btn-outline btn-block">
              Browse Quizzes
            </Link>
            <Link to="/play" className="btn btn-sm btn-outline btn-block">
              Play Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
