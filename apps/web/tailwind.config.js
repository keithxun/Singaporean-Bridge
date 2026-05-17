/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f5f5f5',
        felt: '#0f5c3d',
        'felt-dark': '#083d24',
        wood: '#2a2a3e',
        'wood-dark': '#1a1a2e',
        'wood-light': '#3a3a4e',
        panel: '#e8e8e8',
        ink: '#f0f0f0',
        gold: '#d4af37',
        'poker-blue': '#0084ff',
        'poker-green': '#00d084',
      },
    },
  },
  plugins: [],
};
