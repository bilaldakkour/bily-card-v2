import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#090b1a',
        panel: '#10142a',
        panelSoft: '#151b37',
        neon: '#22d3ee',
        electric: '#7c3aed',
        accent: '#22c55e',
        danger: '#ef4444',
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(34,211,238,.35), 0 10px 30px rgba(34,211,238,.18)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}

export default config

