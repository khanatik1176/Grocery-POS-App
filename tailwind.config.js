/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#1A1612",
        bark: "#2C261F",
        cream: "#F3EEE4",
        paper: "#FFFBF4",
        saffron: "#E6A11A",
        leaf: "#1E6A45",
        clay: "#C24B38",
        mist: "#8C8376",
      },
    },
  },
  plugins: [],
};
