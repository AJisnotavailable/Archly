/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#070b14',
        },
        surface: {
          base: '#07090e',
          subtle: '#090d15',
          panel: '#0d121c',
          card: '#121724',
          hover: '#181f30',
          border: '#1a2336',
          'border-strong': '#28354f',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 14px -2px rgba(59, 130, 246, 0.25)',
        'glow-md': '0 0 25px -4px rgba(59, 130, 246, 0.35)',
        'glow-cyan': '0 0 20px -3px rgba(56, 189, 248, 0.3)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.3)',
        'inner-light': 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'shimmer': 'shimmer 2.2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
