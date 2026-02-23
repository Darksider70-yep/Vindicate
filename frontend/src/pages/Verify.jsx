import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyCredential } from "../utils/api";

export default function Verify() {
  const { hash: routeHash } = useParams();
  const [hash, setHash] = useState(routeHash || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (routeHash) {
      setHash(routeHash);
    }
  }, [routeHash]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setResult(null);
    setLoading(true);
    try {
      const payload = await verifyCredential(hash);
      setResult(payload);
    } catch (error) {
      setResult({
        error: {
          message: error.message
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const integrityPassed = Boolean(result?.payload?.integrity?.passed);

  return (
    <div
      style={{
        maxWidth: "760px",
        margin: "40px auto",
        background: "white",
        padding: "24px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Verify Credential</h2>
      <form onSubmit={handleVerify}>
        <label htmlFor="hash" style={{ fontWeight: 600 }}>Credential Hash</label>
        <input
          id="hash"
          type="text"
          value={hash}
          onChange={(event) => setHash(event.target.value)}
          placeholder="0x..."
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "6px",
            marginBottom: "12px",
            borderRadius: "6px",
            border: "1px solid #e5e7eb"
          }}
        />
        <button
          type="submit"
          disabled={!hash || loading}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            background: "#0f172a",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      {result && !result.error && (
        <div
          style={{
            marginTop: "18px",
            border: integrityPassed ? "1px solid #22c55e" : "1px solid #ef4444",
            background: integrityPassed ? "#f0fdf4" : "#fef2f2",
            borderRadius: "8px",
            padding: "14px"
          }}
        >
          <p style={{ marginTop: 0, fontWeight: 700, color: integrityPassed ? "#166534" : "#991b1b" }}>
            {integrityPassed ? "Integrity Check Passed" : "Integrity Violation"}
          </p>
          <p style={{ margin: "4px 0" }}>Signed at: {result.signedAt}</p>
          <p style={{ margin: "4px 0" }}>Signature: {result.signature}</p>
          <p style={{ margin: "4px 0" }}>Algorithm: {result.algorithm}</p>
          <pre
            style={{
              marginTop: "10px",
              maxHeight: "360px",
              overflow: "auto",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "10px",
              fontSize: "0.8rem"
            }}
          >
            {JSON.stringify(result.payload, null, 2)}
          </pre>
        </div>
      )}

      {result?.error && (
        <div
          style={{
            marginTop: "18px",
            border: "1px solid #ef4444",
            background: "#fef2f2",
            borderRadius: "8px",
            padding: "12px",
            color: "#991b1b"
          }}
        >
          {result.error.message}
        </div>
      )}
    </div>
  );
}
