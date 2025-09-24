import React, { createContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("jwt_token");
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("jwt_token", token);
    } else {
      localStorage.removeItem("jwt_token");
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1"}/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ username, password }),
      }
    );

    if (!response.ok) {
      throw new Error("Invalid username or password");
    }

    const data = await response.json();
    setToken(data.access_token);
  };

  const logout = () => {
    setToken(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
