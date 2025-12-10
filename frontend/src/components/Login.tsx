import { useState, FormEvent, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [shake, setShake] = useState(false);

    const { login } = useAuth();
    const { addNotification } = useNotification();

    // Check if form is valid for submit button state
    const isFormValid = username.trim().length > 0 && password.trim().length > 0;

    const handleCapsLock = (e: React.KeyboardEvent) => {
        setCapsLockOn(e.getModifierState('CapsLock'));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Validation
        if (!username.trim()) {
            addNotification('Username is required', 'error');
            setShake(true);
            setTimeout(() => setShake(false), 200);
            return;
        }

        if (!password.trim()) {
            addNotification('Password is required', 'error');
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
            addNotification(err.message || 'Incorrect username or password', 'error');
            setShake(true);
            setTimeout(() => setShake(false), 200);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };


    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden" style={{
            background: 'radial-gradient(ellipse at center, #0a1628 0%, #020817 100%)'
        }}>
            {/* Animated Network Background */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Network Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.4 }}>
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.6 }} />
                            <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 0.2 }} />
                        </linearGradient>
                    </defs>
                    {[...Array(8)].map((_, i) => (
                        <line
                            key={i}
                            x1={`${Math.random() * 100}%`}
                            y1={`${Math.random() * 100}%`}
                            x2={`${Math.random() * 100}%`}
                            y2={`${Math.random() * 100}%`}
                            stroke="url(#lineGradient)"
                            strokeWidth="1"
                            style={{
                                animation: `linePulse ${4 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`
                            }}
                        />
                    ))}
                </svg>

                {/* Glowing Nodes */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={`node-${i}`}
                        className="absolute rounded-full"
                        style={{
                            width: '4px',
                            height: '4px',
                            top: `${15 + Math.random() * 70}%`,
                            left: `${10 + Math.random() * 80}%`,
                            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, transparent 70%)',
                            boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)',
                            animation: `nodePulse ${2 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`
                        }}
                    />
                ))}

                {/* Subtle Stars */}
                {[...Array(60)].map((_, i) => (
                    <div
                        key={`star-${i}`}
                        className="absolute w-px h-px bg-white rounded-full"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            opacity: 0.3 + Math.random() * 0.4,
                            animation: `twinkle ${3 + Math.random() * 4}s linear ${Math.random() * 5}s infinite`,
                        }}
                    />
                ))}
            </div>

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
                    <div className="flex flex-col items-center justify-center mb-8">
                        {/* RRS Shield Logo */}
                        <div className="mb-4">
                            <svg
                                width="80"
                                height="80"
                                viewBox="0 0 100 100"
                                fill="none"
                                className="drop-shadow-2xl"
                            >
                                {/* Shield outline */}
                                <path
                                    d="M50 10 L85 22 L85 45 Q85 70 50 92 Q15 70 15 45 L15 22 Z"
                                    stroke="#3b82f6"
                                    strokeWidth="2.5"
                                    fill="rgba(59, 130, 246, 0.2)"
                                />
                                {/* Inner shield glow */}
                                <path
                                    d="M50 15 L80 25 L80 45 Q80 67 50 87 Q20 67 20 45 L20 25 Z"
                                    fill="rgba(59, 130, 246, 0.1)"
                                />
                                {/* RRS Text */}
                                <text
                                    x="50"
                                    y="55"
                                    fontFamily="Arial, sans-serif"
                                    fontSize="28"
                                    fontWeight="bold"
                                    fill="#3b82f6"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    RRS
                                </text>
                            </svg>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-white mb-2" style={{ 
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            letterSpacing: '0.5px'
                        }}>
                            RRS | Ransomware Response Platform
                        </h1>
                        <p className="text-sm text-gray-400" style={{ letterSpacing: '0.3px' }}>
                            Security Operations Center Login
                        </p>
                    </div>

                    {/* Error messages now shown as toast notifications */}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username Field */}
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-xs font-medium text-gray-400 mb-2"
                            >
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    <User size={18} />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username"
                                    className="w-full pl-11 pr-4 py-3 text-sm rounded-lg text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    style={{
                                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                                        border: '1px solid rgba(71, 85, 105, 0.4)'
                                    }}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-xs font-medium text-gray-400 mb-2"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyUp={handleCapsLock}
                                    placeholder="Password"
                                    className="w-full pl-11 pr-12 py-3 text-sm rounded-lg text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    style={{
                                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                                        border: '1px solid rgba(71, 85, 105, 0.4)'
                                    }}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 transition-colors focus:outline-none"
                                    tabIndex={-1}
                                    disabled={loading}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {capsLockOn && (
                                <p className="mt-1 text-xs text-yellow-400">
                                    ⚠️ Caps Lock is on
                                </p>
                            )}
                        </div>

                        {/* Remember Me & Forgot Password Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border border-gray-500 bg-transparent text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                                    disabled={loading}
                                />
                                <label htmlFor="remember" className="ml-2 text-sm text-gray-400 cursor-pointer select-none">
                                    Remember me
                                </label>
                            </div>
                            <a
                                href="#"
                                className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                                onClick={(e) => {
                                    e.preventDefault();
                                    addNotification('Password reset is not configured yet', 'info');
                                }}
                            >
                                Forgot Password?
                            </a>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={loading || !isFormValid}
                            className="w-full py-3 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400/50 active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                                color: '#fff',
                                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
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
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        © 2023 RRS. All rights reserved.
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
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }

        @keyframes linePulse {
          0%, 100% { opacity: 0.3; stroke-width: 1; }
          50% { opacity: 0.6; stroke-width: 1.5; }
        }

        @keyframes nodePulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.6;
          }
          50% { 
            transform: scale(1.5);
            opacity: 1;
          }
        }

        .animate-shake {
          animation: shake 200ms ease-in-out;
        }
      `}</style>
        </div>
    );
};

export default Login;
