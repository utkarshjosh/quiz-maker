import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useAuthRefresh } from "@/hooks/useAuthRefresh";
import LoginModal from "./LoginModal";
import UserProfile from "./UserProfile";

const AuthTestPage = () => {
  const { isAuthenticated, user, isLoading, fetchUserProfile } = useAuth();
  const {
    isAuthenticated: refreshAuth,
    user: refreshUser,
    isLoading: refreshLoading,
    error: refreshError,
    checkAuth,
    refreshToken,
    logout: refreshLogout,
    authenticatedRequest,
  } = useAuthRefresh();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [testResult, setTestResult] = useState<string>("");

  const handleTestProfile = async () => {
    console.log("Testing profile fetch...");
    const profile = await fetchUserProfile();
    console.log("Profile result:", profile);
  };

  const handleTestRefreshAuth = async () => {
    try {
      const response = await authenticatedRequest(
        "http://localhost:3000/api/v1/development/auth/check"
      );
      const data = await response.json();
      setTestResult(
        `Status: ${response.status}, Data: ${JSON.stringify(data, null, 2)}`
      );
    } catch (err) {
      setTestResult(`Error: ${err}`);
    }
  };

  const handleRefreshToken = async () => {
    try {
      await refreshToken();
      setTestResult("Refresh completed");
    } catch (err) {
      setTestResult(`Refresh error: ${err}`);
    }
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
              <h2 className="card-title">Authentication Status (Old Auth)</h2>

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

                <div className="stat">
                  <div className="stat-title">JWT Cookie</div>
                  <div className="stat-value text-lg">
                    {document.cookie.includes("access_token")
                      ? "✅ Present"
                      : "❌ Missing"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-title">All Cookies</div>
                  <div className="stat-value text-xs">
                    <pre className="whitespace-pre-wrap break-all">
                      {document.cookie || "No cookies"}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Refresh Auth Service Status */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Refresh Auth Service Status</h2>

              <div className="stats stats-vertical lg:stats-horizontal">
                <div className="stat">
                  <div className="stat-title">Status</div>
                  <div
                    className={`stat-value text-lg ${refreshAuth ? "text-success" : "text-error"}`}>
                    {refreshLoading
                      ? "Loading..."
                      : refreshAuth
                        ? "Authenticated"
                        : "Not Authenticated"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-title">User</div>
                  <div className="stat-value text-lg">
                    {refreshUser ? refreshUser.email : "None"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-title">Access Token</div>
                  <div className="stat-value text-lg">
                    {document.cookie.includes("access_token")
                      ? "✅ Present"
                      : "❌ Missing"}
                  </div>
                </div>
              </div>

              {refreshError && (
                <div className="alert alert-error mt-4">
                  <strong>Error:</strong> {refreshError}
                </div>
              )}
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

          {/* Refresh Auth Service Actions */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Refresh Auth Service Actions</h2>

              <div className="flex flex-wrap gap-4">
                <button
                  className="btn btn-primary"
                  onClick={handleTestRefreshAuth}>
                  Test Auth Request
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleRefreshToken}>
                  Refresh Token
                </button>

                <button className="btn btn-outline" onClick={checkAuth}>
                  Check Auth
                </button>

                <button className="btn btn-error" onClick={refreshLogout}>
                  Logout
                </button>
              </div>

              {testResult && (
                <div className="mt-4 p-4 bg-base-200 rounded-lg">
                  <h3 className="font-bold mb-2">Test Result:</h3>
                  <pre className="text-sm whitespace-pre-wrap">
                    {testResult}
                  </pre>
                </div>
              )}
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
