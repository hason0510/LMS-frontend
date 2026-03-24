module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        'background-light': '#f6f7f8',
        'background-dark': '#0b1116',
      },
      fontFamily: {
        display: ['Lexend', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
