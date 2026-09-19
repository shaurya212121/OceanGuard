/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ocean-bg': '#0a0f18',
        'ocean-base': '#0a0f18',
        'ocean-panel': '#111827',
        'ocean-panel-dark': '#0d1524',
        'ocean-panel-light': '#1e293b',
        'ocean-border': '#1e293b',
        'ocean-border-light': '#334155',
        'ocean-border-cyan': 'rgba(0, 240, 255, 0.35)',
        'ocean-text': '#f8fafc',
        'ocean-text-dim': '#94a3b8',
        'ocean-text-muted': '#64748b',
        'ocean-cyan': '#00f0ff',
        'ocean-sky': '#38bdf8',
        'ocean-red': '#f43f5e',
        'ocean-amber': '#f59e0b',
        'ocean-green': '#10b981',
      },
      fontFamily: {
        sans: ['"Inter"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        DEFAULT: '#1e293b',
      },
      boxShadow: {
        'tactical-cyan': '0 0 15px rgba(0, 240, 255, 0.25)',
        'tactical-red': '0 0 15px rgba(244, 63, 94, 0.3)',
        'tactical-amber': '0 0 15px rgba(245, 158, 11, 0.25)',
      }
    },
  },
  plugins: [],
};
