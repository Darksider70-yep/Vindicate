import { useState } from "react";
import Loader from "../components/Loader";

export default function Dashboard() {
  const [form, setForm] = useState({
    name: "",
    skill: "",
    issuer: ""
  });
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploaded(null);

    try {
      // ✅ IMPORTANT FIX: backend runs on 4000, not 5173
      const res = await fetch("http://localhost:4000/api/credentials/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      setUploaded(data);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "40px auto",
        background: "white",
        padding: "24px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
      }}
    >
      <h2 style={{ marginBottom: "16px" }}>Issue Credential</h2>

      <form onSubmit={handleSubmit}>
        <label style={{ fontWeight: 500 }}>Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Student / Candidate name"
          required
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "6px",
            marginBottom: "12px",
            borderRadius: "6px",
            border: "1px solid #e5e7eb"
          }}
        />

        <label style={{ fontWeight: 500 }}>Skill</label>
        <input
          type="text"
          name="skill"
          value={form.skill}
          onChange={handleChange}
          placeholder="Skill or qualification"
          required
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "6px",
            marginBottom: "12px",
            borderRadius: "6px",
            border: "1px solid #e5e7eb"
          }}
        />

        <label style={{ fontWeight: 500 }}>Issuer</label>
        <input
          type="text"
          name="issuer"
          value={form.issuer}
          onChange={handleChange}
          placeholder="Institution / Organization"
          required
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "6px",
            marginBottom: "16px",
            borderRadius: "6px",
            border: "1px solid #e5e7eb"
          }}
        />

        <button
          type="submit"
          disabled={loading}
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
          {loading ? "Issuing..." : "Issue Credential"}
        </button>
      </form>

      {loading && (
        <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
          <Loader />
        </div>
      )}

      {uploaded && (
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            border: "1px solid #22c55e",
            background: "#f0fdf4",
            borderRadius: "8px"
          }}
        >
          <p style={{ color: "#15803d", fontWeight: 600 }}>
            ✔ Credential Issued Successfully
          </p>

          <p style={{ fontSize: "0.9rem", marginTop: "8px" }}>
            <b>IPFS Hash:</b>{" "}
            <span style={{ fontFamily: "monospace" }}>
              {uploaded.ipfsHash}
            </span>
          </p>

          {uploaded.transaction?.txHash && (
            <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
              <b>Transaction:</b>{" "}
              <span style={{ fontFamily: "monospace" }}>
                {uploaded.transaction.txHash}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
