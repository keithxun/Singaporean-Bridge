/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f0e6d0',
        felt: '#2d6a40',
        'felt-dark': '#1b4a2a',
        wood: '#a0724a',
        'wood-dark': '#7a5230',
        panel: '#ede0c8',
        ink: '#2c1a0e',
        gold: '#c8991a',
      },
    },
  },
  plugins: [],
};
