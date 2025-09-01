import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import LoginModal from "./LoginModal";
import UserProfile from "./UserProfile";

const AuthTestPage = () => {
  const { isAuthenticated, user, isLoading, fetchUserProfile } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleTestProfile = async () => {
    console.log("Testing profile fetch...");
    const profile = await fetchUserProfile();
    console.log("Profile result:", profile);
  };

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Auth0 Integration Test</h1>
          <p className="text-gray-600">Test the OAuth authentication flow</p>
        </div>

        {/* Navigation Bar */}
        <div className="navbar bg-base-100 rounded-lg shadow-lg mb-8">
          <div className="navbar-start">
            <span className="text-xl font-bold">Quiz Maker</span>
          </div>

          <div className="navbar-end">
            {isAuthenticated ? (
              <UserProfile />
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setShowLoginModal(true)}>
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Authentication Status */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Authentication Status</h2>

              <div className="stats stats-vertical lg:stats-horizontal">
                <div className="stat">
                  <div className="stat-title">Status</div>
                  <div
                    className={`stat-value text-lg ${isAuthenticated ? "text-success" : "text-error"}`}>
                    {isLoading
                      ? "Loading..."
                      : isAuthenticated
                        ? "Authenticated"
                        : "Not Authenticated"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-title">User</div>
                  <div className="stat-value text-lg">
                    {user ? user.name || user.email : "None"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-title">Session Cookie</div>
                  <div className="stat-value text-lg">
                    {document.cookie.includes("appSession")
                      ? "✅ Present"
                      : "❌ Missing"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Profile Card */}
          {isAuthenticated && user && (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">User Profile</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {user.name || "Not provided"}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {user.email}
                    </div>
                    <div>
                      <span className="font-medium">Verified:</span>
                      <span
                        className={`ml-2 badge ${user.emailVerified ? "badge-success" : "badge-warning"}`}>
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Auth0 ID:</span>
                      <span className="text-sm font-mono ml-2">
                        {user.auth0Id}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Internal ID:</span>
                      <span className="text-sm font-mono ml-2">{user.id}</span>
                    </div>
                    {user.picture && (
                      <div>
                        <span className="font-medium">Picture:</span>
                        <img
                          src={user.picture}
                          alt="Profile"
                          className="w-16 h-16 rounded-full ml-2 inline-block"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleTestProfile}>
                    Refresh Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Actions</h2>

              <div className="flex flex-wrap gap-4">
                {!isAuthenticated && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowLoginModal(true)}>
                    Test Login Flow
                  </button>
                )}

                <button
                  className="btn btn-outline"
                  onClick={() => window.location.reload()}>
                  Reload Page
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => console.log("Cookies:", document.cookie)}>
                  Log Cookies
                </button>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Debug Information</h2>

              <div className="mockup-code">
                <pre data-prefix="$">
                  <code>Current URL: {window.location.href}</code>
                </pre>
                <pre data-prefix="$">
                  <code>
                    Has appSession:{" "}
                    {document.cookie.includes("appSession") ? "Yes" : "No"}
                  </code>
                </pre>
                <pre data-prefix="$">
                  <code>
                    Auth State:{" "}
                    {JSON.stringify(
                      { isAuthenticated, isLoading, hasUser: !!user },
                      null,
                      2
                    )}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="Test Auth0 Login"
          description="This will redirect you to Auth0 for authentication"
        />
      </div>
    </div>
  );
};

export default AuthTestPage;
