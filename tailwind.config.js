/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        "WinkySans-Medium": ["WinkySans-Medium", "sans-serif"],
        "WinkySans-Regular": ["WinkySans-Regular", "sans-serif"]
      },
      colors: {
        "primary": "green",
        "secondary": "beige",
        "teirtiary": "grey",
        "black": "black",
        "white": "white"
      }},
  },
  plugins: [],
}