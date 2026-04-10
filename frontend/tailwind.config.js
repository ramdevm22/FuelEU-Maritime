/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ocean: {
          950: '#020b18',
          900: '#041524',
          800: '#072135',
          700: '#0d3254',
          600: '#164d7a',
          500: '#1e6ea0',
          400: '#2a8fcb',
          300: '#5ab0e0',
          200: '#93cff0',
          100: '#cce8f8',
        },
        teal: {
          400: '#2dd4bf',
          300: '#5eead4',
        },
        amber: {
          400: '#fbbf24',
          300: '#fcd34d',
        },
      },
    },
  },
  plugins: [],
};
