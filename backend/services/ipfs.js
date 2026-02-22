import { create } from "ipfs-http-client";

// Connect to IPFS via Infura
const client = create({ url: "https://ipfs.infura.io:5001" });

export async function uploadToIPFS(fileData) {
  const { cid } = await client.add(fileData);
  return cid.toString(); // IPFS hash
}

export async function getFromIPFS(hash) {
  const stream = client.cat(hash);
  let data = "";
  for await (const chunk of stream) {
    data += chunk.toString();
  }
  return data;
}
