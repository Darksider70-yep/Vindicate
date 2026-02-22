import { useState } from "react";
import { verifyCredential } from "../utils/api";

function Verify() {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await verifyCredential(hash);
      setResult(res);
    } catch (err) {
      setResult({ valid: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        background: "white",
        padding: "24px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
      }}
    >
      <h2 style={{ marginBottom: "16px" }}>Verify Credential</h2>

      <form onSubmit={handleVerify}>
        <label style={{ fontWeight: 500 }}>IPFS Hash</label>
        <input
          type="text"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          placeholder="Enter IPFS Hash"
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

      {result && (
        <div style={{ marginTop: "24px" }}>
          {result.valid ? (
            /* VALID RESULT */
            <div
              style={{
                border: "1px solid #22c55e",
                background: "#f0fdf4",
                padding: "16px",
                borderRadius: "8px"
              }}
            >
              <p style={{ color: "#15803d", fontWeight: 600 }}>
                ✔ Credential Verified
              </p>

              <p style={{ fontSize: "0.9rem", marginTop: "8px" }}>
                <b>IPFS Hash:</b>{" "}
                <span style={{ fontFamily: "monospace" }}>
                  {result.hash}
                </span>
              </p>

              {/* Certificate data */}
              {result.fileData && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    background: "white"
                  }}
                >
                  <h4>Certificate Data</h4>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
                    {typeof result.fileData === "string"
                      ? result.fileData
                      : JSON.stringify(result.fileData, null, 2)}
                  </pre>
                </div>
              )}

              {/* File preview (PDF/Image) */}
              {result.fileData &&
                typeof result.fileData === "string" &&
                result.fileData.startsWith("data:") && (
                  <div style={{ marginTop: "20px" }}>
                    <h4>Certificate Preview</h4>
                    <iframe
                      src={result.fileData}
                      width="100%"
                      height="400px"
                      title="certificate-preview"
                      style={{ borderRadius: "6px", border: "1px solid #e5e7eb" }}
                    />
                  </div>
                )}
            </div>
          ) : (
            /* INVALID RESULT */
            <div
              style={{
                border: "1px solid #ef4444",
                background: "#fef2f2",
                padding: "16px",
                borderRadius: "8px"
              }}
            >
              <p style={{ color: "#b91c1c", fontWeight: 600 }}>
                ✖ Credential Not Found or Invalid
              </p>
            </div>
          )}

          {result.error && (
            <p style={{ color: "red", marginTop: "8px" }}>
              Error: {result.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Verify;
