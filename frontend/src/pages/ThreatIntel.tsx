import React, { useState } from "react";

type AbuseIpdbResult = Record<string, unknown>;
type MalwareBazaarResult = Record<string, unknown>;

const ThreatIntel: React.FC = () => {
  // AbuseIPDB states
  const [ipInput, setIpInput] = useState("");
  const [ipResult, setIpResult] = useState<AbuseIpdbResult | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);

  // MalwareBazaar states
  const [hashInput, setHashInput] = useState("");
  const [hashResult, setHashResult] = useState<MalwareBazaarResult | null>(null);
  const [hashLoading, setHashLoading] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

  // Handle AbuseIPDB lookup
  const handleIpLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIpLoading(true);
    setIpError(null);
    setIpResult(null);

    try {
      const token = localStorage.getItem("rrs_access_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(
        `${API_BASE}/threatintel/abuseipdb?ip=${encodeURIComponent(ipInput)}`,
        { headers }
      );
      if (!resp.ok) throw new Error(`API error: ${resp.statusText}`);
      const data = await resp.json();
      setIpResult(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setIpError(message);
    } finally {
      setIpLoading(false);
    }
  };

  // Handle MalwareBazaar lookup
  const handleHashLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setHashLoading(true);
    setHashError(null);
    setHashResult(null);

    try {
      const token = localStorage.getItem("rrs_access_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(
        `${API_BASE}/threatintel/malwarebazaar?hash=${encodeURIComponent(hashInput)}`,
        { headers }
      );
      if (!resp.ok) throw new Error(`API error: ${resp.statusText}`);
      const data = await resp.json();
      setHashResult(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setHashError(message);
    } finally {
      setHashLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
      <header className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-8 shadow-2xl shadow-indigo-900/30">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">
          Threat Intelligence Workbench
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-50">
          Manual Enrichment & Adversary Reconnaissance
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200/70">
          Validate suspicious indicators against AbuseIPDB and MalwareBazaar. Toggle integrations via
          environment variables to demonstrate graceful degradation.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/40">
        <h2 className="text-xl font-semibold text-slate-50">AbuseIPDB IP Lookup</h2>
        <p className="mt-1 text-xs text-slate-400">
          Submit an IP address to retrieve reputation data and confidence scores.
        </p>
        <form onSubmit={handleIpLookup} className="mt-4 flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Enter IPv4 or IPv6 address"
            className="flex-grow rounded-lg border border-slate-700/70 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={ipLoading}
            className="rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/30 disabled:opacity-50"
          >
            {ipLoading ? "Looking up..." : "Run Lookup"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-sm">
          {ipError && <p className="text-rose-400">Error: {ipError}</p>}
          {ipResult && (
            <pre className="max-h-64 overflow-auto text-xs text-slate-200">
              {JSON.stringify(ipResult, null, 2)}
            </pre>
          )}
          {!ipError && !ipResult && (
            <p className="text-xs text-slate-400">
              Results will appear here. AbuseIPDB integration requires `ABUSEIPDB_API_KEY` to be configured.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/40">
        <h2 className="text-xl font-semibold text-slate-50">MalwareBazaar Hash Lookup</h2>
        <p className="mt-1 text-xs text-slate-400">
          Query malware artefacts by MD5/SHA1/SHA256 hash to retrieve sandbox metadata.
        </p>
        <form onSubmit={handleHashLookup} className="mt-4 flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Enter file hash (MD5/SHA1/SHA256)"
            className="flex-grow rounded-lg border border-slate-700/70 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={hashLoading}
            className="rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/30 disabled:opacity-50"
          >
            {hashLoading ? "Looking up..." : "Lookup"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-sm">
          {hashError && <p className="text-rose-400">Error: {hashError}</p>}
          {hashResult && (
            <pre className="max-h-64 overflow-auto text-xs text-slate-200">
              {JSON.stringify(hashResult, null, 2)}
            </pre>
          )}
          {!hashError && !hashResult && (
            <p className="text-xs text-slate-400">
              Provide a hash to retrieve MalwareBazaar intelligence. Integration is optional but enabled by default.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ThreatIntel;
