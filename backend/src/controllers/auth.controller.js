import { createChallenge, verifyLogin } from "../services/auth/siwe.service.js";

export async function login(req, res) {
  if (req.body.action === "challenge") {
    const challenge = await createChallenge(req.body.address);
    return res.status(200).json({
      data: challenge
    });
  }

  const session = await verifyLogin(req.body.message, req.body.signature);
  return res.status(200).json({
    data: session
  });
}
