/** Tailwind v3 config for NativeWind — tokens mirror web src/styles/tokens.css */
module.exports = {
  content: ['./App.tsx', './app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#1d5c52',
          hover: '#14453d',
          soft: '#eaf3f1',
          border: '#bcd9d4',
          ink: '#0f3831',
          bright: '#3db89f',
        },
        clay: { DEFAULT: '#a46b52', soft: '#f8eee8', border: '#e8c7b9' },
        canvas: '#fcfaf7',
        card: '#ffffff',
        'card-subtle': '#f8f5ef',
        line: '#e6dfd5',
        'line-soft': '#efe9e0',
        ink: '#22302c',
        muted: '#5b6e69',
        faint: '#849691',
        urgent: { DEFAULT: '#c0392b', strong: '#dc2626', bg: '#fdf3f2', border: '#eec4c1' },
      },
    },
  },
  plugins: [],
};
