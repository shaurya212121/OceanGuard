/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ocean-bg': '#030C14',
        'ocean-panel': '#0A1929',
        'ocean-panel-light': '#0F2138',
        'ocean-border': '#1E3A8A',
        'ocean-border-light': '#1E40AF',
        'ocean-text': '#E0F2FE',
        'ocean-text-dim': '#7DD3FC',
        'ocean-text-muted': '#475569',
        'ocean-cyan': '#00F0FF',
        'ocean-sky': '#0EA5E9',
        'ocean-red': '#FF2A5F',
        'ocean-amber': '#FBBF24',
        'ocean-green': '#10F2A0',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        DEFAULT: '#1E3A8A',
      },
    },
  },
  plugins: [],
};
