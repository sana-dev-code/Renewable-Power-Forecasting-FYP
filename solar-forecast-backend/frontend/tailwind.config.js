/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',                                   // ✅ dark mode via class
  content: ["./src/**/*.{js,jsx,ts,tsx}"],             // ✅ scan all React files
  theme: { extend: {} },
  plugins: [],
};
