import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, authenticating, loginWithWallet, hasEthereumProvider } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await loginWithWallet();
      navigate("/dashboard");
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <div
      style={{
        textAlign: "center",
        maxWidth: "760px",
        margin: "70px auto",
        padding: "0 16px"
      }}
    >
      <h1 style={{ fontSize: "2.4rem", fontWeight: 700 }}>Vindicate</h1>
      <p style={{ marginTop: "12px", fontSize: "1.05rem", color: "#475569" }}>
        Wallet-authenticated trust governance for verifiable blockchain credentials.
      </p>

      {!user ? (
        <button
          type="button"
          onClick={handleLogin}
          disabled={authenticating || !hasEthereumProvider}
          style={{
            marginTop: "28px",
            padding: "11px 18px",
            borderRadius: "8px",
            background: "#0f172a",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          {authenticating ? "Signing..." : "Sign-In With Ethereum"}
        </button>
      ) : (
        <div style={{ marginTop: "24px" }}>
          <p>
            Signed in as <strong>{user.role}</strong>
          </p>
          <Link to="/dashboard">Go to dashboard</Link>
        </div>
      )}
    </div>
  );
}
