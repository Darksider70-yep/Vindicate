import CertificateCard from "./CertificateCard";

export default function ExplorerView({ credentials }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "12px"
      }}
    >
      {credentials.map((cred, idx) => (
        <CertificateCard key={idx} {...cred} />
      ))}
    </div>
  );
}
