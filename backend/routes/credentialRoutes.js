import express from "express";
import { getFromIPFS } from "../services/ipfs.js";
import { verifyProofBackend } from "../services/blockchain.js";

const router = express.Router();

router.get("/verify/:hash", async (req, res) => {
  try {
    const { hash } = req.params;

    const userAddress = "0x0000000000000000000000000000000000000000"; // temp / demo
    const { valid } = await verifyProofBackend(userAddress, hash);
    if (!valid) return res.json({ valid: false, error: "Credential not found on blockchain" });

    const fileData = await getFromIPFS(hash);
    res.json({ valid: true, hash, fileData });
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

export default router;