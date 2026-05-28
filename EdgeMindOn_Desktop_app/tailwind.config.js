/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          raised: '#1a1d27',
          overlay: '#22263a'
        },
        accent: {
          DEFAULT: '#6366f1',
          dim: '#4f46e5'
        },
        success: '#22c55e',
        warn: '#f59e0b',
        danger: '#ef4444',
        muted: '#64748b'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    }
  },
  plugins: []
}
