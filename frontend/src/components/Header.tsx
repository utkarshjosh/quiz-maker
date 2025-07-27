import { Search, User, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="w-full bg-primary text-primary-foreground px-4 py-3 shadow-lg">
     
      <div  className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-8 h-8 animate-pulse text-yellow-300 drop-shadow-[0_0_0.5rem_#ffffff]" />
            <div className="absolute -top-1 -left-1 w-8 h-8">
              <Brain className="w-8 h-8 text-teal-300 opacity-70 animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
          <div className="text-2xl font-black" style={{
            background: 'linear-gradient(to right, #4FC3F7, #B388FF, #4AEDC4)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
            letterSpacing: '0.05em',
            transform: 'skew(-5deg)',
          }}>
            QuizChamp
          </div>
        </div>
        </Link>
        {/* Center - Join Game Input */}
        <div className="flex-1 max-w-md flex items-center gap-3">
          <span className="text-sm font-medium whitespace-nowrap">Join Game? Enter PIN:</span>
          <Input
            placeholder="123 456"
            className="bg-white/90 border-white/20 text-gray-800 placeholder:text-gray-500 rounded-full px-4 font-mono text-center tracking-wider"
            maxLength={7}
          />
        </div>
        
        {/* Right side - Search and Profile */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search quizzes..."
              className="bg-white/90 border-white/20 text-gray-800 placeholder:text-gray-500 rounded-full pl-9 pr-4 w-48"
            />
          </div>
          <Link to="/user/profile">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/20">
              <User className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;