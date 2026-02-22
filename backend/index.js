import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

const __dirname = path.resolve();
const abiPath = path.join(__dirname, "../smart-contracts/artifacts/contracts/SkillProof.sol/SkillProof.json");
const SkillProof = JSON.parse(fs.readFileSync(abiPath, "utf8"));

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Example ABI route
app.get("/api/abi", (req, res) => {
  res.json(SkillProof.abi);
});

// Your credential routes
import credentialRoutes from "./routes/credentialRoutes.js";
app.use("/api/credentials", credentialRoutes);

app.listen(4000, () => {
  console.log("✅ Backend running on http://localhost:4000");
});
