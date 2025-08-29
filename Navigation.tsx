import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { Sparkles } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  return (
    <nav className="bg-background/80 backdrop-blur-md border-b border-border shadow-lg sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-cyan-500 rounded-lg flex items-center justify-center animate-pulse-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
              Vindicate
            </h1>
          </div>

          {/* Navigation buttons */}
          <div className="hidden md:flex space-x-2">
            {['landing', 'dashboard', 'about', 'contact'].map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                  currentPage === page
                    ? 'text-primary bg-primary/10 shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {page.charAt(0).toUpperCase() + page.slice(1)}
              </button>
            ))}
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => onPageChange('menu')}
            >
              Menu
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
