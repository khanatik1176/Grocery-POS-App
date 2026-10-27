/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F6F8",
        surface: "#FFFFFF",
        line: "#E4E7EC",
        ink: "#101828",
        body: "#344054",
        muted: "#667085",
        faint: "#98A2B3",
        brand: { DEFAULT: "#0E9F6E", dark: "#057A55", soft: "#E7F6EF" },
        warn: { DEFAULT: "#B54708", soft: "#FEF0C7" },
        danger: { DEFAULT: "#D92D20", soft: "#FEE4E2" },
        info: { DEFAULT: "#1570EF", soft: "#EFF8FF" },
        bkash: "#E2136E",
        nagad: "#F6921E",
        rocket: "#8C3494",
      },
    },
  },
  plugins: [],
};
