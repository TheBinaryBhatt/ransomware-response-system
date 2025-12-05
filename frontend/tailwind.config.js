/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // RRS Design System Colors
                'dark-bg': '#1F2121',
                'dark-surface': '#252727',
                'dark-border': '#3A3C3C',

                'text-primary': '#FCFCF9',
                'text-secondary': '#A7A9A9',

                'accent-teal': '#32B8C6',
                'accent-teal-dark': '#2A9FA8',

                // Status Colors
                'status-critical': '#EF4444',
                'status-warning': '#F59E0B',
                'status-success': '#10B981',
                'status-info': '#32B8C6',
                'status-pending': '#6B7280',
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
                mono: ['"Fira Code"', '"JetBrains Mono"', 'Consolas', 'monospace'],
            },
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1rem', { lineHeight: '1.5rem' }],
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
            },
            spacing: {
                '72': '18rem',
                '84': '21rem',
                '96': '24rem',
            },
            animation: {
                'count-up': 'countUp 1s ease-out',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'fade-in': 'fadeIn 200ms ease-in',
                'slide-in-left': 'slideInLeft 300ms ease-out',
                'slide-in-right': 'slideInRight 300ms ease-out',
                'shimmer': 'shimmer 2s linear infinite',
                'draw-line': 'drawLine 1s ease-out',
            },
            keyframes: {
                countUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseGlow: {
                    '0%, 100%': {
                        boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)',
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                    },
                    '50%': {
                        boxShadow: '0 0 20px rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                    },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
                drawLine: {
                    '0%': { strokeDashoffset: '1000' },
                    '100%': { strokeDashoffset: '0' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glow-teal': '0 0 20px rgba(50, 184, 198, 0.3)',
                'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.24)',
                'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
            },
        },
    },
    plugins: [],
}
