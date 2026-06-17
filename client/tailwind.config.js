/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        'accent': 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'text-base': 'var(--text-base)',
        'text-2': 'var(--text-2)',
        'text-muted': 'var(--text-muted)',
        'bg-app': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'border-app': 'var(--border)',
      },
      borderRadius: {
        'app': 'var(--radius)',
        'app-sm': 'var(--radius-sm)',
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
