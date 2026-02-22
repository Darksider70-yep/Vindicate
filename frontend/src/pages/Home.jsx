import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        textAlign: "center",
        maxWidth: "700px",
        margin: "80px auto"
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700 }}>
        Vindicate
      </h1>

      <p style={{ marginTop: "12px", fontSize: "1.1rem", color: "#475569" }}>
        Verifiable credentials secured on blockchain.
      </p>

      <div
        style={{
          marginTop: "40px",
          display: "flex",
          justifyContent: "center",
          gap: "16px"
        }}
      >
        <Link to="/dashboard">
          <button
            style={{
              padding: "10px 18px",
              borderRadius: "6px",
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: "pointer"
            }}
          >
            Issue Credential
          </button>
        </Link>

        <Link to="/verify">
          <button
            style={{
              padding: "10px 18px",
              borderRadius: "6px",
              background: "#0f172a",
              color: "white",
              border: "none",
              cursor: "pointer"
            }}
          >
            Verify Credential
          </button>
        </Link>
      </div>
    </div>
  );
}
