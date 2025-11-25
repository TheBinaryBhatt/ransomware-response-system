/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          primary: '#1F2121',
          secondary: '#2D2F2F',
          accent: '#32B8C6',
          surface: '#252727'
        },
        cream: '#FCFCF9',
        teal: {
          500: '#218D8D',
          600: '#32B8C6'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'count-up': 'countUp 1s ease-out',
        'hover-lift': 'hoverLift 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'gradient-border': 'gradientBorder 3s ease infinite',
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(50, 184, 198, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(50, 184, 198, 0.1) 1px, transparent 1px)
        `,
      }
    },
  },
  plugins: [],
}