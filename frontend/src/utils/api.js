const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

export async function uploadCredential(data) {
  const res = await fetch(`${API_BASE}/credentials/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function verifyCredential(hash) {
  const res = await fetch(`${API_BASE}/credentials/verify/${hash}`);
  return res.json();
}

