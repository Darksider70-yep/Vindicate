import { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { shortAddress, cn } from "../../utils/ui";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/verify", label: "Verify" },
  { to: "/explorer", label: "Explorer" }
];

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? "Light" : "Dark"}
    </Button>
  );
}

export default function AppHeader() {
  const { user, authenticating, loginWithWallet, logout, hasEthereumProvider } = useAuth();
  const { pushToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabel = useMemo(() => {
    if (!user?.role) {
      return "Visitor";
    }

    return user.role.replaceAll("_", " ");
  }, [user?.role]);

  const handleLogin = async () => {
    if (!hasEthereumProvider) {
      window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
      pushToast("MetaMask is required for SIWE login.", "warning");
      return;
    }

    try {
      await loginWithWallet();
      pushToast("Wallet connected. Welcome to Vindicate.", "success");
      navigate("/dashboard");
    } catch (error) {
      pushToast(error.message || "SIWE authentication failed.", "error");
    }
  };

  const handleLogout = async () => {
    await logout(false);
    pushToast("Session closed.", "info");
    navigate("/");
  };

  const closeDrawer = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text md:hidden"
          >
            <span className="text-lg font-semibold">{mobileOpen ? "x" : "="}</span>
          </button>

          <Link to="/" className="inline-flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              V
            </span>
            <span className="font-display text-lg font-semibold text-text">Vindicate</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted hover:bg-panel hover:text-text"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-lg border border-border/70 bg-panel px-3 py-1.5 lg:flex">
                <Badge tone="primary">{roleLabel}</Badge>
                <span className="text-xs font-medium text-muted">{shortAddress(user.walletAddress)}</span>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" loading={authenticating} onClick={handleLogin}>
              {hasEthereumProvider ? "Connect Wallet" : "Install MetaMask"}
            </Button>
          )}
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border/80 bg-surface md:hidden" aria-label="Mobile navigation menu">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-3 py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeDrawer}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition",
                    isActive ? "bg-primary/15 text-primary" : "text-muted hover:bg-panel hover:text-text"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            {user ? (
              <div className="mt-2 rounded-lg border border-border/80 bg-panel px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Signed in</p>
                <p className="mt-1 text-sm font-semibold text-text">{roleLabel}</p>
                <p className="text-xs text-muted">{shortAddress(user.walletAddress)}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {mobileOpen && location.pathname ? <button type="button" className="sr-only" onClick={closeDrawer}>Close menu</button> : null}
    </header>
  );
}