import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [shake, setShake] = useState(false);

    const { login } = useAuth();

    const handleCapsLock = (e: React.KeyboardEvent) => {
        setCapsLockOn(e.getModifierState('CapsLock'));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!username.trim()) {
            setError('Username is required');
            setShake(true);
            setTimeout(() => setShake(false), 200);
            return;
        }

        setLoading(true);

        try {
            await login(username, password);

            // Store remember me preference
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid credentials');
            setShake(true);
            setTimeout(() => setShake(false), 200);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };


    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-dark-bg">
            {/* Subtle animated background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/10 to-transparent animate-pulse"
                    style={{ animationDuration: '8s' }} />
            </div>

            {/* Starfield particles */}
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        opacity: 0.2 + Math.random() * 0.3,
                        animation: `twinkle ${3 + Math.random() * 4}s linear ${Math.random() * 5}s infinite`,
                    }}
                />
            ))}

            {/* Login Card */}
            <div
                className={`relative z-10 w-[90%] max-w-[480px] mx-4 animate-fade-in ${shake ? 'animate-shake' : ''}`}
                style={{
                    animation: 'cardEnter 300ms ease-out',
                }}
            >
                <div
                    className="rounded-2xl shadow-2xl p-8"
                    style={{
                        backgroundColor: 'rgba(37, 39, 39, 0.85)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(50, 184, 198, 0.1)',
                    }}
                >
                    {/* Logo/Branding Area */}
                    <div className="h-[110px] flex items-center justify-center mb-8">
                        <svg
                            width="80"
                            height="80"
                            viewBox="0 0 80 80"
                            fill="none"
                            className="drop-shadow-lg"
                        >
                            <path
                                d="M40 5 L70 15 L70 35 Q70 55 40 75 Q10 55 10 35 L10 15 Z"
                                stroke="#32B8C6"
                                strokeWidth="2.5"
                                fill="rgba(50, 184, 198, 0.15)"
                            />
                            <rect x="30" y="35" width="20" height="18" rx="2" fill="#32B8C6" />
                            <path
                                d="M32 35 L32 30 Q32 25 40 25 Q48 25 48 30 L48 35"
                                stroke="#32B8C6"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <circle cx="40" cy="44" r="2.5" fill="#1F2121" />
                        </svg>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-text-primary mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Ransomware Response Platform
                        </h1>
                        <p className="text-sm text-text-secondary">
                            Security Operations Center
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div
                            className="mb-6 p-3 bg-status-critical/15 border-2 border-status-critical rounded-lg text-status-critical text-sm animate-slide-in-left"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username Field */}
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-xs font-medium text-text-primary mb-2"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                className={`w-full px-4 py-3 font-mono text-sm bg-dark-bg/50 border-2 rounded-lg text-text-primary placeholder-text-secondary/50 transition-all duration-200 ${error && !username.trim()
                                    ? 'border-status-critical focus:border-status-critical focus:ring-2 focus:ring-status-critical/20'
                                    : 'border-text-secondary/60 focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20'
                                    } focus:outline-none`}
                                disabled={loading}
                                aria-invalid={error && !username.trim() ? 'true' : 'false'}
                                aria-describedby={error ? 'username-error' : undefined}
                            />
                            {error && !username.trim() && (
                                <p id="username-error" className="mt-1 text-xs text-status-critical">
                                    Username is required
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-xs font-medium text-text-primary mb-2"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyUp={handleCapsLock}
                                    placeholder="Enter password"
                                    className="w-full px-4 py-3 pr-12 font-mono text-sm bg-dark-bg/50 border-2 border-text-secondary/60 rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal/20 transition-all duration-200"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-accent-teal transition-colors focus:outline-none focus:text-accent-teal"
                                    tabIndex={-1}
                                    disabled={loading}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {capsLockOn && (
                                <p className="mt-1 text-xs text-status-warning">
                                    ⚠️ Caps Lock is on
                                </p>
                            )}
                        </div>

                        {/* Remember Me Checkbox */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-5 h-5 rounded border-2 border-accent-teal bg-dark-bg text-accent-teal focus:ring-2 focus:ring-accent-teal focus:ring-offset-0 cursor-pointer transition-all checked:bg-accent-teal"
                                disabled={loading}
                            />
                            <label htmlFor="remember" className="ml-2 text-sm text-text-secondary cursor-pointer select-none">
                                Remember me
                            </label>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-accent-teal hover:bg-accent-teal/90 text-dark-bg font-semibold rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-dark-surface active:scale-95"
                            style={{
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                            }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>

                        {/* Default Credentials */}
                        <div className="text-center">
                            <p className="text-xs text-text-secondary font-light">
                                Default credentials: <span className="font-mono">admin / admin123</span>
                            </p>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="text-center">
                            <a
                                href="#"
                                className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-not-allowed opacity-50"
                                onClick={(e) => e.preventDefault()}
                            >
                                Forgot Password?
                            </a>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-text-secondary font-light">
                        © 2025 RRS
                    </p>
                </div>
            </div>

            {/* Animations */}
            <style>{`
        @keyframes cardEnter {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }

        .animate-shake {
          animation: shake 200ms ease-in-out;
        }
      `}</style>
        </div>
    );
};

export default Login;
