/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'system-bg': '#0a0a1a',
        'system-panel': '#1a1a2f',
        'system-accent': '#00f7ff',
        'system-text': '#e0e0e0',
        'system-border': 'rgba(0, 247, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
