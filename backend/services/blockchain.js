import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// -----------------------------
// Contract ABI
// -----------------------------
const __dirname = path.resolve();
const abiPath = path.join(
  __dirname,
  "../smart-contracts/artifacts/contracts/SkillProof.sol/SkillProof.json"
);
const contractJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// -----------------------------
// Backend (Hardhat/Ganache)
// -----------------------------
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const privateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // dev only
const signer = new ethers.Wallet(privateKey, provider);
const backendContract = new ethers.Contract(contractAddress, contractJson.abi, signer);

// -----------------------------
// Backend functions
// -----------------------------
export async function storeProofBackend(ipfsHash) {
  const tx = await backendContract.storeProof(ipfsHash);
  await tx.wait();
  return tx.hash;
}

export async function listUserProofsBackend(userAddress) {
  try {
    return await backendContract.getProofs(userAddress);
  } catch (err) {
    console.error("Failed to fetch proofs:", err);
    return [];
  }
}

export async function verifyProofBackend(userAddress, ipfsHash) {
  try {
    const valid = await backendContract.verifyProof(userAddress, ipfsHash);
    return { valid };
  } catch (err) {
    console.error("Backend verification failed:", err);
    return { valid: false, error: err.message };
  }
}

// -----------------------------
// Frontend (MetaMask)
// -----------------------------
export async function storeProofFrontend(ipfsHash) {
  try {
    if (!window.ethereum) throw new Error("MetaMask not detected");

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();

    const contract = new ethers.Contract(contractAddress, contractJson.abi, signer);
    const tx = await contract.storeProof(ipfsHash);
    await tx.wait();

    return { success: true, txHash: tx.hash };
  } catch (err) {
    console.error("Failed to store proof:", err);
    return { success: false, error: err.message };
  }
}

export async function verifyFromBlockchain(ipfsHash) {
  try {
    if (!window.ethereum) throw new Error("MetaMask not detected");

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    const contract = new ethers.Contract(contractAddress, contractJson.abi, signer);
    const isValid = await contract.callStatic.verifyProof(userAddress, ipfsHash);

    return { valid: Boolean(isValid) };
  } catch (err) {
    console.error("Blockchain verification failed:", err);
    return { valid: false, error: err.message };
  }
}

export async function listUserProofsFrontend(userAddress) {
  try {
    if (!window.ethereum) throw new Error("MetaMask not detected");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, contractJson.abi, provider);

    const proofs = await contract.getProofs(userAddress);
    return proofs;
  } catch (err) {
    console.error("Failed to list proofs:", err);
    return [];
  }
}
