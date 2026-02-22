import React from "react";

export default function CertificateCard({ name, skill, issuer, ipfsHash }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
    }}>
      <h3 style={{ fontWeight: 600 }}>{name}</h3>
      <p><b>Skill:</b> {skill}</p>
      <p><b>Issuer:</b> {issuer}</p>
      <p style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#64748b" }}>
        {ipfsHash}
      </p>
    </div>
  );
}
