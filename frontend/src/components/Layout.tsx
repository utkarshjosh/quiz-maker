import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import CategoryCarousel from "./CategoryCarousel";

const Layout = () => {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith("/play") || location.pathname.startsWith("/immersive");
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-pink/20">
      {!hideHeader && (
        <div className="sticky top-0 z-50 bg-primary shadow-lg">
          <Header />
        </div>
      )}
      <div className="bg-gradient-to-br from-background to-quiz-pink/20">
        {!hideHeader && <CategoryCarousel />}
        <main className={hideHeader ? "min-h-screen" : "container mx-auto px-4"}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 