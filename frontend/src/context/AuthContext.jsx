/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  clearSessionTokens,
  fetchMe,
  getSessionTokens,
  logoutSession,
  refreshAuth,
  requestNonce,
  setRefreshHandler,
  setSessionTokens,
  verifySiwe
} from "../utils/api";

const AuthContext = createContext(null);

function hasEthereumProvider() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  const applyAuthPayload = useCallback((payload) => {
    setSessionTokens({
      access: payload.accessToken,
      refresh: payload.refreshToken,
      csrf: payload.csrfToken
    });
    setUser(payload.user);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const payload = await refreshAuth();
      applyAuthPayload(payload);
      return true;
    } catch {
      clearSessionTokens();
      setUser(null);
      return false;
    }
  }, [applyAuthPayload]);

  useEffect(() => {
    setRefreshHandler(refreshSession);
    return () => setRefreshHandler(null);
  }, [refreshSession]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const tokens = getSessionTokens();
        if (!tokens.accessToken && (tokens.refreshToken || tokens.csrfToken)) {
          const refreshed = await refreshSession();
          if (!refreshed) {
            setLoading(false);
            return;
          }
        }

        if (getSessionTokens().accessToken) {
          const profile = await fetchMe();
          setUser(profile);
        }
      } catch {
        clearSessionTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [refreshSession]);

  const loginWithWallet = useCallback(async () => {
    if (!hasEthereumProvider()) {
      throw new Error("MetaMask (or EIP-1193 wallet) is required");
    }

    setAuthenticating(true);
    try {
      const [address] = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      if (!address) {
        throw new Error("Wallet address unavailable");
      }

      const challenge = await requestNonce(address);
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challenge.message, address]
      });
      const verified = await verifySiwe(challenge.message, signature);
      applyAuthPayload(verified);
      return verified.user;
    } finally {
      setAuthenticating(false);
    }
  }, [applyAuthPayload]);

  const logout = useCallback(async (allSessions = false) => {
    try {
      await logoutSession(allSessions);
    } finally {
      clearSessionTokens();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authenticating,
      loginWithWallet,
      refreshSession,
      logout,
      isAuthenticated: Boolean(user),
      hasEthereumProvider: hasEthereumProvider()
    }),
    [authenticating, loading, loginWithWallet, logout, refreshSession, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
