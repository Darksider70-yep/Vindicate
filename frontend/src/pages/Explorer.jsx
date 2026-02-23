import { useEffect, useState } from "react";
import ExplorerView from "../components/ExplorerView";

export default function Explorer() {
  const [credentials, setCredentials] = useState([]);

  useEffect(() => {
    // Mock data
    setCredentials([
      { name: "Alice", skill: "Blockchain", issuer: "MIT", ipfsHash: "Qm123..." },
      { name: "Bob", skill: "AI", issuer: "Stanford", ipfsHash: "Qm456..." },
    ]);
  }, []);

  return (
    <div className="surface" style={{ padding: "18px" }}>
      <h1 style={{ marginTop: 0, marginBottom: "10px", fontSize: "1.8rem" }}>Credential Explorer</h1>
      <p style={{ marginTop: 0, color: "#475569" }}>Public sample listing for verified credentials.</p>
      <ExplorerView credentials={credentials} />
    </div>
  );
}
