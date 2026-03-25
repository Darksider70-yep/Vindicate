import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import fetcher from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { user } = await fetcher("/auth/me");
        setUser(user);
        setRole(user.role);
      } catch (error) {
        // Not logged in
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("No crypto wallet found. Please install it.");
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const { chainId } = await provider.getNetwork();

      const { nonce } = await fetcher("/auth/nonce");

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Vindicate.",
        uri: window.location.origin,
        version: "1",
        chainId: Number(chainId),
        nonce,
      });

      const signature = await signer.signMessage(message.prepareMessage());

      const { user } = await fetcher("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ message, signature }),
      });

      setUser(user);
      setRole(user.role);
    } catch (error) {
      console.error("Login failed", error);
      // Handle error (e.g., show a toast notification)
    }
  };

  const logout = async () => {
    try {
      await fetcher("/auth/logout", { method: "POST" });
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
