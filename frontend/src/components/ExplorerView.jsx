import React from "react";
import CertificateCard from "./CertificateCard";

export default function ExplorerView({ credentials }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {credentials.map((cred, idx) => (
        <CertificateCard key={idx} {...cred} />
      ))}
    </div>
  );
}
