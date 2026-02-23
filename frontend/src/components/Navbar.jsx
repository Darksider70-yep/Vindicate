import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function shortAddress(address) {
  if (!address) {
    return "";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Navbar() {
  const { user, authenticating, loginWithWallet, logout, hasEthereumProvider } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!hasEthereumProvider) {
      window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await loginWithWallet();
      navigate("/dashboard");
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleLogout = async () => {
    await logout(false);
    navigate("/");
  };

  return (
    <nav
      style={{
        padding: "14px 18px",
        borderBottom: "1px solid #e5e7eb",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(6px)",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}
    >
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/verify">Verify</Link>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ fontSize: "0.9rem", color: "#475569" }}>
              {user.role} | {shortAddress(user.walletAddress)}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: "white",
                cursor: "pointer"
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            disabled={authenticating}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: "#0f172a",
              color: "white",
              border: "none",
              cursor: "pointer"
            }}
          >
            {authenticating ? "Signing..." : hasEthereumProvider ? "Connect Wallet" : "Install MetaMask"}
          </button>
        )}
      </div>
    </nav>
  );
}
