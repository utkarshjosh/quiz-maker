import React, { useState } from "react";
import { useAuthRefresh } from "../hooks/useAuthRefresh";

const AuthTest: React.FC = () => {
  const {
    isAuthenticated,
    user,
    isLoading,
    error,
    checkAuth,
    refreshToken,
    logout,
    authenticatedRequest,
  } = useAuthRefresh();
  const [testResult, setTestResult] = useState<string>("");

  const handleTestAuth = async () => {
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

  const handleRefresh = async () => {
    try {
      await refreshToken();
      setTestResult("Refresh completed");
    } catch (err) {
      setTestResult(`Refresh error: ${err}`);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", margin: "20px" }}>
      <h3>Auth Test Component</h3>

      <div>
        <strong>Status:</strong>{" "}
        {isAuthenticated ? "Authenticated" : "Not Authenticated"}
      </div>

      {user && (
        <div>
          <strong>User:</strong> {user.email}
        </div>
      )}

      {error && (
        <div style={{ color: "red" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ marginTop: "10px" }}>
        <button onClick={checkAuth} style={{ marginRight: "10px" }}>
          Check Auth
        </button>
        <button onClick={handleRefresh} style={{ marginRight: "10px" }}>
          Refresh Token
        </button>
        <button onClick={handleTestAuth} style={{ marginRight: "10px" }}>
          Test Auth Request
        </button>
        <button onClick={logout}>Logout</button>
      </div>

      {testResult && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px",
            backgroundColor: "#f5f5f5",
          }}>
          <strong>Test Result:</strong>
          <pre>{testResult}</pre>
        </div>
      )}
    </div>
  );
};

export default AuthTest;
