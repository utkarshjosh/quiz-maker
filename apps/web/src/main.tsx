import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./auth/AuthContext";

// Set DaisyUI theme
document.documentElement.setAttribute("data-theme", "quizchamp");

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
