/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'barlow-condensed': ['"Barlow Condensed"', 'ui-sans-serif', 'sans-serif'],
        'barlow': ['Barlow', 'ui-sans-serif', 'sans-serif'],
      },
      keyframes: {
      slideUp: {
        "0%": { transform: "translateY(100%)" },
        "100%": { transform: "translateY(0%)" },
      },
    },
    animation: {
      slideUp: "slideUp 0.2s ease-out",
    },
    },
  },
  plugins: [],
}