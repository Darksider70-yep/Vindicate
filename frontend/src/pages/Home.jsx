import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHealth } from "../utils/api";

export default function Home() {
  const { user, authenticating, loginWithWallet, hasEthereumProvider } = useAuth();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState("checking");

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

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        await getHealth();
        if (mounted) setBackendStatus("online");
      } catch {
        if (mounted) setBackendStatus("offline");
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      style={{
        maxWidth: "920px",
        margin: "20px auto 0",
        display: "grid",
        gap: "18px"
      }}
    >
      <section
        className="surface"
        style={{
          padding: "28px",
          textAlign: "center"
        }}
      >
        <h1 style={{ fontSize: "2.2rem", margin: "0 0 10px", fontWeight: 750 }}>Vindicate</h1>
        <p style={{ margin: 0, fontSize: "1.02rem", color: "#475569" }}>
          Blockchain-backed credential verification with secure institutional governance.
        </p>

        <div
          style={{
            marginTop: "20px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            borderRadius: "999px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc"
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              background:
                backendStatus === "online"
                  ? "#16a34a"
                  : backendStatus === "offline"
                    ? "#dc2626"
                    : "#f59e0b"
            }}
          />
          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#334155" }}>
            Backend: {backendStatus}
          </span>
        </div>

        {!user ? (
          <button
            type="button"
            onClick={handleLogin}
            disabled={authenticating}
            style={{
              marginTop: "22px",
              padding: "11px 18px",
              borderRadius: "8px",
              background: "#0f172a",
              color: "white",
              border: "none",
              cursor: "pointer"
            }}
          >
            {authenticating ? "Signing..." : hasEthereumProvider ? "Sign-In With Ethereum" : "Install MetaMask"}
          </button>
        ) : (
          <div style={{ marginTop: "24px" }}>
            <p>
              Signed in as <strong>{user.role}</strong>
            </p>
            <Link to="/dashboard">Go to dashboard</Link>
          </div>
        )}
      </section>

      <section
        style={{
          display: "grid",
          gap: "14px",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
        }}
      >
        <div className="surface" style={{ padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>Issue & Revoke</h3>
          <p style={{ color: "#475569" }}>Controlled by wallet roles and institution governance.</p>
          <Link to="/dashboard">Open dashboard</Link>
        </div>

        <div className="surface" style={{ padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>Verify Integrity</h3>
          <p style={{ color: "#475569" }}>Check hash integrity against blockchain + IPFS.</p>
          <Link to="/verify">Open verification</Link>
        </div>

        <div className="surface" style={{ padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>Troubleshooting</h3>
          <p style={{ color: "#475569" }}>
            If backend is offline, start `backend`, `hardhat`, Postgres, and IPFS.
          </p>
        </div>
      </section>
    </div>
  );
}
