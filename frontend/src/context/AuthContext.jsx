import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // "institution", "issuer", "student", "verifier"

  const login = (role) => {
    // In a real app, you'd have a proper authentication flow.
    // Here, we're just simulating login for different roles.
    setUser({ name: `Test ${role}` });
    setRole(role);
  };

  const logout = () => {
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
