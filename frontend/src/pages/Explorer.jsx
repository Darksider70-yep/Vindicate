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
    <div>
      <h1 className="text-2xl font-bold mb-4">Credential Explorer</h1>
      <ExplorerView credentials={credentials} />
    </div>
  );
}
