// ============================================
// Animated Network Background - Login Page Theme
// Blue/Cyan Gradient with Network Lines
// ============================================

import React from 'react';

interface AnimatedBackgroundProps {
    opacity?: number;
    lineCount?: number;
    nodeCount?: number;
    starCount?: number;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
    opacity = 0.4,
    lineCount = 8,
    nodeCount = 12,
    starCount = 60,
}) => {
    return (
        <>
            {/* Animated Network Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Network Lines */}
                <svg className="absolute inset-0 w-full h-full" style={{ opacity }}>
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.6 }} />
                            <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 0.2 }} />
                        </linearGradient>
                    </defs>
                    {[...Array(lineCount)].map((_, i) => (
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
                {[...Array(nodeCount)].map((_, i) => (
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
                {[...Array(starCount)].map((_, i) => (
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

            {/* Global Animations */}
            <style>{`
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

                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.7; }
                }
            `}</style>
        </>
    );
};

export default AnimatedBackground;
