import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";

const AppHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, login, logout, loading } = useAuth();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/explorer", label: "Explorer" },
    { href: "/verify", label: "Verify" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/vite.svg" alt="Vindicate" className="h-8 w-8" />
          <span className="font-bold text-lg">Vindicate</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </Button>
          {user ? (
            <Button onClick={logout} variant="secondary" size="sm" disabled={loading}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={login} size="sm" disabled={loading}>
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden">
          <nav className="flex flex-col space-y-2 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-muted hover:text-text"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
