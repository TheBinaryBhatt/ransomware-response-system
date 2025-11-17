import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await auth.login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setLocalError(message);
    }
  };

  const error = localError || auth.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.3),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.2),_transparent_55%)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/70 bg-slate-900/80 p-8 shadow-2xl shadow-indigo-950/50 backdrop-blur">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">Secure Access</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-50">Ransomware Response Console</h1>
          <p className="mt-2 text-xs text-slate-400">
            Use your SOC credentials to access real-time incident orchestration.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Username
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Password
            </label>
            <input
              type="password"
              className="mt-1 block w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={auth.isLoading}
            className="w-full rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/30 disabled:opacity-60"
          >
            {auth.isLoading ? "Authenticating..." : "Access Console"}
          </button>
        </form>
        <div className="mt-6 text-center text-[11px] uppercase tracking-[0.3em] text-slate-500">
          MITRE-aligned Ransomware Response | © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default Login;
