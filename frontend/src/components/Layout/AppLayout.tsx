import React from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";

const navItems = [
    { label: "Dashboard", to: "/", icon: "📊" },
    { label: "Threat Intel", to: "/threat-intel", icon: "🛰️" }
];

type AppLayoutProps = {
    children: React.ReactNode;
};

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const auth = React.useContext(AuthContext);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="relative flex min-h-screen">
                <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/60 bg-slate-900/60 backdrop-blur">
                    <div className="px-6 py-8 border-b border-slate-800/50">
                        <h1 className="text-xl font-semibold tracking-wide">
                            Ransomware Response
                        </h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Unified SOC automation platform
                        </p>
                    </div>
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === "/"}
                                className={({ isActive }) =>
                                    [
                                        "flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                                        isActive
                                            ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/60"
                                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                                    ].join(" ")
                                }
                            >
                                <span aria-hidden>{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="px-6 py-6 border-t border-slate-800/50 text-xs text-slate-500">
                        <p className="font-semibold text-slate-300">Secure Ops Status</p>
                        <p className="mt-1">Auto-response: <span className="text-emerald-400">Enabled</span></p>
                        <p>{new Date().toLocaleString()}</p>
                    </div>
                </aside>

                <div className="flex flex-1 flex-col">
                    <header className="flex items-center justify-between border-b border-slate-800/60 bg-slate-900/40 px-6 py-4 backdrop-blur">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-indigo-300">
                                Security Operations Center
                            </p>
                            <h2 className="text-lg font-semibold">Adaptive Ransomware Defense</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex flex-col text-right text-xs text-slate-400">
                                <span>Analyst: {auth?.isAuthenticated ? "SOC Analyst" : "Guest"}</span>
                                <span className="text-slate-500">Integrated services online</span>
                            </div>
                            <a
                                href="https://github.com/TheBinaryBhatt/ransomware-response-system/blob/main/docs/demo-playbook.md"
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-indigo-500/60 px-4 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                            >
                                View Playbook
                            </a>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AppLayout;

