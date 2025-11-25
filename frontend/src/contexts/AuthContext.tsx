import type { ReactNode } from "react";
import React, { createContext, useCallback, useMemo, useState } from "react";

interface AuthContextType {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user?: { username: string };
}

const TOKEN_STORAGE_KEY = "rrs_access_token";
const USERNAME_STORAGE_KEY = "rrs_username";
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
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_STORAGE_KEY));
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
      localStorage.setItem(USERNAME_STORAGE_KEY, username);
      setToken(accessToken);
      setUsername(username);
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
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    setToken(null);
    setUsername(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      login,
      logout,
      isAuthenticated: Boolean(token),
      isLoading,
      error,
      user: username ? { username } : undefined
    }),
    [token, login, logout, isLoading, error, username]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use AuthContext
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};