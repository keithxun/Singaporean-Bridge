/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#90EE90',
        felt: '#2d6a40',
        'felt-dark': '#1b4a2a',
        wood: '#a0724a',
        'wood-dark': '#7a5230',
        'wood-light': '#D2B48C',
        panel: '#f5f5f5',
        ink: '#000000',
        gold: '#c8991a',
      },
    },
  },
  plugins: [],
};
