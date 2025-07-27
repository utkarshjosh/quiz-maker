import { Outlet } from "react-router-dom";
import Header from "./Header";
import CategoryCarousel from "./CategoryCarousel";

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-quiz-pink/20">
      <div className="sticky top-0 z-50 bg-primary shadow-lg">
        <Header />
      </div>
      <div className="bg-gradient-to-br from-background to-quiz-pink/20">
        <CategoryCarousel />
        <main className="container mx-auto px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 