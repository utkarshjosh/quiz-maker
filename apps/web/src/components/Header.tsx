import { Search, User, Brain, LogOut, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const { isAuthenticated, user, login, logout, isLoading } = useAuth();

  const handleLogin = () => {
    login({
      returnTo: window.location.pathname,
    });
  };

  const handleLogout = () => {
    logout();
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="w-full bg-primary text-primary-content px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="w-8 h-8 animate-pulse logo-accent drop-shadow-[0_0_0.5rem_rgba(255,255,255,0.3)]" />
              <div className="absolute -top-1 -left-1 w-8 h-8">
                <Brain
                  className="w-8 h-8 logo-secondary opacity-70 animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
            <div className="text-2xl font-black logo-gradient">QuizChamp</div>
          </div>
        </Link>
        {/* Center - Join Game Input */}
        <div className="flex-1 max-w-md flex items-center gap-3">
          <span className="text-sm font-medium whitespace-nowrap">
            Join Game? Enter PIN:
          </span>
          <Input
            placeholder="123 456"
            className="bg-base-100 border-base-300 text-base-content placeholder:text-base-content/50 rounded-full px-4 font-mono text-center tracking-wider"
            maxLength={7}
          />
        </div>

        {/* Right side - Search and Profile */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 w-4 h-4" />
            <Input
              placeholder="Search quizzes..."
              className="bg-base-100 border-base-300 text-base-content placeholder:text-base-content/50 rounded-full pl-9 pr-4 w-48"
            />
          </div>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-primary-content/20 animate-pulse" />
          ) : isAuthenticated ? (
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={user?.picture}
                      alt={user?.name || user?.email}
                    />
                    <AvatarFallback className="bg-secondary text-secondary-content">
                      {getInitials(user?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-100 rounded-box w-56 border border-base-300">
                <li className="menu-title">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-base-content">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-base-content/70">
                      {user?.email}
                    </p>
                  </div>
                </li>
                <div className="divider my-1"></div>
                <li>
                  <Link
                    to="/user/profile"
                    className="flex items-center gap-2 hover:bg-base-200 rounded-lg p-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>Profile</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/play"
                    className="flex items-center gap-2 hover:bg-base-200 rounded-lg p-2">
                    <Settings className="h-4 w-4 text-secondary" />
                    <span>My Games</span>
                  </Link>
                </li>
                <div className="divider my-1"></div>
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-error hover:text-error-content hover:bg-error/10 rounded-lg p-2 w-full text-left">
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <Button
              className="btn btn-primary rounded-full"
              onClick={handleLogin}
              disabled={isLoading}>
              {isLoading ? "Loading..." : "Sign in"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
