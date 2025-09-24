import React, { useState } from "react";

const ThreatIntel: React.FC = () => {
  // AbuseIPDB states
  const [ipInput, setIpInput] = useState("");
  const [ipResult, setIpResult] = useState<any>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);

  // MalwareBazaar states
  const [hashInput, setHashInput] = useState("");
  const [hashResult, setHashResult] = useState<any>(null);
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
      const resp = await fetch(`${API_BASE}/threatintel/abuseipdb?ip=${encodeURIComponent(ipInput)}`);
      if (!resp.ok) throw new Error(`API error: ${resp.statusText}`);
      const data = await resp.json();
      setIpResult(data.data);
    } catch (err: any) {
      setIpError(err.message || "Unknown error");
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
      const resp = await fetch(`${API_BASE}/threatintel/malwarebazaar?hash=${encodeURIComponent(hashInput)}`);
      if (!resp.ok) throw new Error(`API error: ${resp.statusText}`);
      const data = await resp.json();
      setHashResult(data.data);
    } catch (err: any) {
      setHashError(err.message || "Unknown error");
    } finally {
      setHashLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12">
      <h1 className="text-3xl font-bold mb-6">Manual Threat Intelligence Lookup</h1>

      {/* AbuseIPDB Section */}
      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">AbuseIPDB IP Lookup</h2>
        <form onSubmit={handleIpLookup} className="flex space-x-4 items-center">
          <input
            type="text"
            placeholder="Enter IPv4 or IPv6 address"
            className="flex-grow border rounded px-4 py-2 focus:ring-2 focus:ring-blue-500"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={ipLoading}
            className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50`}
          >
            {ipLoading ? "Looking up..." : "Lookup"}
          </button>
        </form>

        {/* Result */}
        <div className="mt-6">
          {ipError && <p className="text-red-600">Error: {ipError}</p>}
          {ipResult && (
            <pre className="overflow-auto bg-gray-100 p-4 rounded text-sm">
              {JSON.stringify(ipResult, null, 2)}
            </pre>
          )}
        </div>
      </section>

      {/* MalwareBazaar Section */}
      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">MalwareBazaar Hash Lookup</h2>
        <form onSubmit={handleHashLookup} className="flex space-x-4 items-center">
          <input
            type="text"
            placeholder="Enter file hash (MD5/SHA1/SHA256)"
            className="flex-grow border rounded px-4 py-2 focus:ring-2 focus:ring-blue-500"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={hashLoading}
            className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50`}
          >
            {hashLoading ? "Looking up..." : "Lookup"}
          </button>
        </form>

        {/* Result */}
        <div className="mt-6">
          {hashError && <p className="text-red-600">Error: {hashError}</p>}
          {hashResult && (
            <pre className="overflow-auto bg-gray-100 p-4 rounded text-sm">
              {JSON.stringify(hashResult, null, 2)}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
};

export default ThreatIntel;
