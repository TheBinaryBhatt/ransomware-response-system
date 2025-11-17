import type { ReactNode } from "react";
import React, { createContext, useCallback, useMemo, useState } from "react";

interface AuthContextType {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const TOKEN_STORAGE_KEY = "rrs_access_token";
const API_BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:8000/api/v1";
const TOKEN_URL = `${API_BASE_URL}/token`;

export const AuthContext = createContext<AuthContextType>({
  token: null,
  login: async () => undefined,
  logout: () => undefined,
  isAuthenticated: false,
  isLoading: false,
  error: null
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error("Invalid username or password");
      }

      const data = await response.json();
      const accessToken = data.access_token;
      if (!accessToken) {
        throw new Error("Authentication token not provided by server");
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      setToken(accessToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      login,
      logout,
      isAuthenticated: Boolean(token),
      isLoading,
      error
    }),
    [token, login, logout, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};